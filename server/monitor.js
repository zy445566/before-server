const bsConfig = require('../.bsrc.js');
const {getConfig, listenCallBack, getConfigTipString, matchProxyTableKeysUrlIndex} = require('../util/index')
const {getSecWebSocketAccept, decodeSocketFrame,encodeSocketFrame} = require('../util/websocket')
Object.assign(bsConfig, getConfig());
const path = require('path');
const Koa = require('koa');
const koaStatic = require('koa-static');
const koaRouter = require('koa-router');
const router = new koaRouter({
    prefix: '/api'
})
router.get('/get_config',async (ctx)=>{
    ctx.body = bsConfig
})

router.get('/get_config_tip',async (ctx)=>{
    ctx.body = {
        tip:getConfigTipString()
    }
})

function pushEventDataToList(historyEventDataList, eventData) {
    if(historyEventDataList.length>bsConfig.HistoryNumber) {
        historyEventDataList.shift()
    }
    historyEventDataList.push(eventData)
}
module.exports = function start () {
    const proxyTableKeys = Object.keys(bsConfig.proxyTable)
    const app = new Koa();
    app.use(koaStatic(path.join(__dirname, 'static'),{index:'index.html'}));
    app.use(router.routes())
    const server = app.listen(bsConfig.monitorPort,listenCallBack('monitor','http',`127.0.0.1:${bsConfig.monitorPort}`));
    const historyEventDataMap = {};
    historyEventDataMap[""] = [];
    for(const proxyTableKey of proxyTableKeys) {
        historyEventDataMap[proxyTableKey] = [];
    }
    app.on('proxy-request-info', function(eventData){
        const proxyTableIndex = matchProxyTableKeysUrlIndex(eventData.req.url,proxyTableKeys);
        if(proxyTableIndex>=0) {
            const proxyTableKey = proxyTableKeys[proxyTableIndex];
            pushEventDataToList(historyEventDataMap[proxyTableKey], eventData);
        }
        // 监控全部要额外推送
        pushEventDataToList(historyEventDataMap[""], eventData);
    })
    server.on('upgrade', (req, socket, head) => {
        const secWebSocketAccept = getSecWebSocketAccept(req.headers['sec-websocket-key'])
        socket.write(
            'HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
            'Upgrade: WebSocket\r\n' +
            'Connection: Upgrade\r\n' +
            'Sec-WebSocket-Accept: '+ secWebSocketAccept +'\r\n' +
            '\r\n'
        );
        let fifterConfig = {key:""}
        socket.on('data', (data) => {
            const frame = decodeSocketFrame(data);
            if(frame.opcode===1) {
                const data = JSON.parse(frame.payloadBuf.toString());
                if(data.type === 'config') {
                    fifterConfig = data.config;
                } else if (data.type === 'history') {
                    if(!historyEventDataMap[fifterConfig.key]) {return;}
                    for(const historyEventData of historyEventDataMap[fifterConfig.key]) {
                        sendProxyRequestInfoFunc(historyEventData)
                    }
                }
            }
            if(frame.opcode===8) {
                socket.end()
            }
        });
        let sendProxyRequestInfoFunc = function(eventData) {
            if(fifterConfig.key) {
                const proxyTableIndex = matchProxyTableKeysUrlIndex(eventData.req.url,proxyTableKeys);
                if(proxyTableIndex>=0) {
                    if(fifterConfig.key===proxyTableKeys[proxyTableIndex]) {
                        socket.write(encodeSocketFrame({
                            fin:1,
                            opcode:1,
                            payloadBuf:Buffer.from(JSON.stringify(eventData))
                        }))
                    }
                }
            } else {
                socket.write(encodeSocketFrame({
                    fin:1,
                    opcode:1,
                    payloadBuf:Buffer.from(JSON.stringify(eventData))
                }))
            }
            
        }
        socket.on('end', () => {
            app.removeListener('proxy-request-info', sendProxyRequestInfoFunc);
        });

        app.on('proxy-request-info', sendProxyRequestInfoFunc);
    });
    return app;
}