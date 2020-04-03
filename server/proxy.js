const bsConfig = require('../.bsrc.js');
const {getConfig, listenCallBack,getConfigTipString} = require('../util')
Object.assign(bsConfig, getConfig());
const https = require('https');
const http = require('http');
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
    req.rawBody = await getStreamData(req);
    req.body = Buffer.concat(req.rawBody).toString();
    for(const key of Object.keys(bsConfig.proxyTable)) {
        if(req.url.indexOf(key)===0) {
            return proxy.web(req, res, {
                buffer:streamify(req.rawBody),
                ...bsConfig.proxyTable[key],
            });
        }
    }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(getConfigTipString())
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
    proxy.on('proxyRes', async function (proxyRes, req, res) {
        proxyRes.rawBody = await getStreamData(proxyRes);
        proxyRes.body = Buffer.concat(proxyRes.rawBody).toString();
        callback({
            req:{
                httpVersion:req.httpVersion,
                headers:req.headers,
                url:req.url,
                method:req.method,
                headers:req.headers,
                body:req.body,
            },
            res:{
                headers:proxyRes.headers,
                trailers:proxyRes.trailers,
                statusCode:proxyRes.statusCode,
                statusMessage:proxyRes.statusMessage,
                body:proxyRes.body,
            }
        })
    });
}
