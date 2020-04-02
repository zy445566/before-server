const bsConfig = require('./.bsrc.js');
const https = require('https');
const http = require('http');
const httpProxy = require('http-proxy');
const proxy = httpProxy.createProxyServer({});

function dealWebRequest(req,res) {
    for(const key of Object.keys(bsConfig.proxyTable)) {
        if(req.url.indexOf(key)===0) {
            return proxy.web(req, res, bsConfig.proxyTable[key]);
        }
    }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(
        '请配置proxyTable在.bsrc.js中后重启服务，如下\n\n'
        +JSON.stringify({
        proxyTable:{
            '/': {
                target: 'http://www.aaa.com'
            },
            '/api': {
                target: 'https://www.bbb.com'
            },
            '/ws': {
                target: 'ws://www.ccc.com'
            },
            '/ws/api': {
                target: 'wss://www.ddd.com'
            }
        }
    },null,2))
}

function dealSocketRequest(req, socket, head) {
    return proxy.ws(req, socket, head);
}

function listenCallBack(type,protocol,hostname) {
    return ()=>{
        console.log(`${type} server listening ${protocol}://${hostname}/`)
    }
}
const httpServer = http.createServer(dealWebRequest);
const httpsServer = https.createServer(bsConfig.ssl,dealWebRequest)
httpServer.listen(bsConfig.httpPort,listenCallBack('proxy','http',`127.0.0.1:${bsConfig.httpPort}`));
httpServer.on('upgrade',dealSocketRequest);
httpsServer.listen(bsConfig.httpsPort,listenCallBack('proxy','https',`127.0.0.1:${bsConfig.httpsPort}`));
httpsServer.on('upgrade',dealSocketRequest);
proxy.on('proxyReq', function (proxyReq, req, res) {
    req.on('data', function (chunk) {
        console.log(chunk.toString());
    });
    req.on('end', function () {
        console.log("req over");
    });
})
proxy.on('proxyRes', function (proxyRes, req, res) {
    proxyRes.on('data', function (chunk) {
        console.log(chunk.toString());
    });
    proxyRes.on('end', function () {
        console.log("res over");
    });
    // console.log(
    //     JSON.stringify(req.httpVersion, true, 2), 
    //     JSON.stringify(req.headers, true, 2), 
    //     JSON.stringify(req.url, true, 2), 
    //     JSON.stringify(req.method, true, 2), 
    //     JSON.stringify(proxyRes.headers, true, 2),
    //     JSON.stringify(proxyRes.trailers, true, 2),
    //     JSON.stringify(proxyRes.statusCode, true, 2),
    //     JSON.stringify(proxyRes.statusMessage, true, 2)
    // );
});
// 等待添加监控界面服务
