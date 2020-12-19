const bsConfig = require('../.bsrc.js');
const {
    getConfig, listenCallBack, getConfigTipString, 
    matchProxyTableKeysUrlIndex,writeDataToFile,
    clearFileData, createPathRewriter
} = require('../util/index')
Object.assign(bsConfig, getConfig());
const https = require('https');
const http = require('http');
const url = require('url');
const streamify = require('stream-array');
const httpProxy = require('http-proxy');
const proxy = httpProxy.createProxyServer({});

function getStreamData(stream) {
    return new Promise ((reslove,reject)=>{
        const chunkList = []
        let removeEventFunc;
        const onDataFunc = function (chunk) {
            chunkList.push(chunk);
        }
        const onEndFunc = function () {
            removeEventFunc()
            reslove(chunkList)
        }
        const onErrorFunc = function (err) {
            removeEventFunc()
            reject(err)
        }
        removeEventFunc = function () {
            stream.removeListener('data', onDataFunc);
            stream.removeListener('end', onEndFunc);
            stream.removeListener('error', onErrorFunc);
        }
        stream.on('data',onDataFunc);
        stream.on('end', onEndFunc);
        stream.on('error', onErrorFunc);
    })
}


async function dealWebRequest(req,res) {
    const proxyTableKeys = Object.keys(bsConfig.proxyTable)
    req.bsData = {
        url:req.url,
        rewrite_url:req.url,
    }
    const proxyTableIndex = matchProxyTableKeysUrlIndex(req.bsData.url,proxyTableKeys)
    if(proxyTableKeys.length<=0){
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(getConfigTipString())
    }
    if(proxyTableIndex<0) {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(`当前URL:${req.bsData.url}匹配索引${proxyTableIndex}失败，请在工作目录的.bsrc.js文件配置当前路径的转发`)
    }
    req.bsData.rawBody = await getStreamData(req);
    req.bsData.body = Buffer.concat(req.bsData.rawBody).toString();
    const proxyConfig = bsConfig.proxyTable[proxyTableKeys[proxyTableIndex]];
    let rewritePathFunc = null;
    if(proxyConfig.pathRewrite) {
        rewritePathFunc = createPathRewriter(proxyConfig.pathRewrite);
    }
    if(rewritePathFunc) {
        const path = await rewritePathFunc(req.url, req);
        if (typeof path === 'string') {
            req.url = path;
            req.bsData.rewrite_url = req.url;
        }
    }
    const targetUrl = proxyConfig.target;
    const targetUrlObj = url.parse(targetUrl);
    req.bsData.protocol = targetUrlObj.protocol;
    req.bsData.host = targetUrlObj.host;
    req.bsData.target = targetUrl;
    req.bsData.start_time = new Date().getTime();
    req.bsData.cors = proxyConfig.cors;
    return proxy.web(req, res, {
        buffer:streamify(req.bsData.rawBody),
        ...proxyConfig,
    });
    
}

function dealSocketRequest(req, socket, head) {
    return proxy.ws(req, socket, head);
}

module.exports = function start (callback = (data)=>{}) {
    const httpServer = http.createServer(dealWebRequest);
    const httpsServer = https.createServer(bsConfig.ssl,dealWebRequest)
    httpServer.listen(bsConfig.httpPort,listenCallBack('proxy','http',`127.0.0.1:${bsConfig.httpPort}`));
    httpServer.on('upgrade',dealSocketRequest);
    httpsServer.listen(bsConfig.httpsPort,listenCallBack('proxy','https',`127.0.0.1:${bsConfig.httpsPort}`));
    httpsServer.on('upgrade',dealSocketRequest);
    const maxBytes = 10*1024*1024;
    const maxCorsTime = 30*24*60*60;
    async function runCallback(req, res) {
        callback({
            req:{
                httpVersion:req.httpVersion,
                headers:req.headers,
                url:req.bsData.url,
                rewrite_url:req.bsData.rewrite_url,
                method:req.method,
                bodyUrl:req.bsData.rawBody.length<maxBytes?null:await writeDataToFile(req.bsData.rawBody,'req'),
                body:req.bsData.rawBody.length<maxBytes?req.bsData.body:'数据过大无法显示',
                protocol:req.bsData.protocol,
                host:req.bsData.host,
                target:req.bsData.target,
                time:req.bsData.end_time-req.bsData.start_time
            },
            res:{
                headers:res.headers,
                trailers:res.trailers,
                statusCode:res.statusCode,
                statusMessage:res.statusMessage,
                bodyUrl:res.bsData.rawBody.length<maxBytes?null:await writeDataToFile(res.bsData.rawBody,'res'),
                body:res.bsData.rawBody.length<maxBytes?res.bsData.body:'数据过大无法显示',
            }
        })
    }
    proxy.on('error', async function (e, req, res) {
        const msg = '请求超时，请检查目标地址是否可用';
        // 防止从undefined取值
        if(!req) {req={}}
        if(!req.bsData) {req.bsData={}}
        if(!req.bsData.rawBody) {req.bsData.rawBody={}}
        if(!res) {res={}}
        if(!res.bsData) {res.bsData={}}
        if(!res.bsData.rawBody) {res.bsData.rawBody={}}
        res.statusCode = 500
        res.statusMessage = 'OutTime'
        res.body = msg
        await runCallback(req, res);
        res.writeHead(500, {
            'Content-Type': 'text/plain; charset=utf-8'
        });
        res.end(msg);
    })
    proxy.on('proxyRes', async function (proxyRes, req, res) {
        if(req.bsData.cors) {
            res.setHeader('Access-Control-Allow-Origin','*');
            res.setHeader('Access-Control-Expose-Headers',Object.keys(proxyRes.headers).join(','));
            res.setHeader('Access-Control-Max-Age',maxCorsTime);
            res.setHeader('Access-Control-Allow-Credentials','true');
            res.setHeader('Access-Control-Allow-Methods',[
                'POST', 'GET', 'HEAD','PUT','DELETE',
                'CONNECT','OPTIONS','TRACE','PATCH'
            ].join(','));
            res.setHeader('Access-Control-Allow-Headers',Object.keys(proxyRes.headers).join(','));
        }
        proxyRes.bsData = {};
        proxyRes.bsData.rawBody = await getStreamData(proxyRes);
        proxyRes.bsData.body = Buffer.concat(proxyRes.bsData.rawBody).toString();
        req.bsData.end_time = new Date().getTime()
        await runCallback(req, proxyRes);
    });
    const clearFileTime = 24*3600*1000;
    clearFileData(clearFileTime)
    setInterval(()=>{
        clearFileData(clearFileTime)
    }, clearFileTime)
}
