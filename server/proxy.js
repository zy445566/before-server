const bsConfig = require('../.bsrc.js');
const {getConfig, listenCallBack, getConfigTipString, matchProxyTableKeysUrlIndex} = require('../util/index')
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
    const proxyTableIndex = matchProxyTableKeysUrlIndex(req.url,proxyTableKeys)
    if(proxyTableKeys.length<=0 && proxyTableIndex<0){
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(getConfigTipString())
    }
    req.rawBody = await getStreamData(req);
    req.body = Buffer.concat(req.rawBody).toString();
    const proxyConfig = bsConfig.proxyTable[proxyTableKeys[proxyTableIndex]];
    const targetUrl = proxyConfig.target;
    const targetUrlObj = url.parse(targetUrl);
    req.protocol = targetUrlObj.protocol;
    req.host = targetUrlObj.host;
    req.target = targetUrl;
    req.start_time = new Date().getTime();
    res.cors = proxyConfig.cors;
    return proxy.web(req, res, {
        buffer:streamify(req.rawBody),
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
    proxy.on('error', async function (e, req, res) {
        const msg = '请求超时，请检查目标地址是否可用';
        callback({
            req:{
                httpVersion:req.httpVersion,
                headers:req.headers,
                url:req.url,
                method:req.method,
                headers:req.headers,
                body:req.rawBody.length<maxBytes?req.body:'数据过大无法显示',
                protocol:req.protocol,
                host:req.host,
                target:req.target,
                time:0
            },
            res:{
                headers:{},
                trailers:{},
                statusCode:500,
                statusMessage:'OutTime',
                body:msg,
            }
        })
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });
        res.end(msg);
    })
    proxy.on('proxyRes', async function (proxyRes, req, res) {
        if(res.cors) {
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
        proxyRes.rawBody = await getStreamData(proxyRes);
        proxyRes.body = Buffer.concat(proxyRes.rawBody).toString();
        req.end_time = new Date().getTime()
        callback({
            req:{
                httpVersion:req.httpVersion,
                headers:req.headers,
                url:req.url,
                method:req.method,
                headers:req.headers,
                body:req.rawBody.length<maxBytes?req.body:'数据过大无法显示',
                protocol:req.protocol,
                host:req.host,
                target:req.target,
                time:req.end_time-req.start_time
            },
            res:{
                headers:proxyRes.headers,
                trailers:proxyRes.trailers,
                statusCode:proxyRes.statusCode,
                statusMessage:proxyRes.statusMessage,
                body:proxyRes.rawBody.length<maxBytes?proxyRes.body:'数据过大无法显示',
            }
        })
    });
}
