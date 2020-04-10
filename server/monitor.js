const bsConfig = require('../.bsrc.js');
const {getConfig, listenCallBack,getConfigTipString} = require('../util/index')
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

module.exports = function start () {
    const app = new Koa();
    app.use(koaStatic(path.join(__dirname, 'static'),{index:'index.html'}));
    app.use(router.routes())
    const server = app.listen(bsConfig.monitorPort,listenCallBack('monitor','http',`127.0.0.1:${bsConfig.monitorPort}`))
    server.on('upgrade', (req, socket, head) => {
        const secWebSocketAccept = getSecWebSocketAccept(req.headers['sec-websocket-key'])
        socket.write('HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
                     'Upgrade: WebSocket\r\n' +
                     'Connection: Upgrade\r\n' +
                     'Sec-WebSocket-Accept: '+ secWebSocketAccept +'\r\n' +
                     '\r\n');
        // socket.on('data', (data) => {
        //     console.log(decodeSocketFrame(data))
        // });
        let sendProxyRequestInfoFunc = function(eventData) {
            socket.write(encodeSocketFrame({
                fin:1,
                opcode:1,
                payloadBuf:Buffer.from(JSON.stringify(eventData))
            }))
        }
        socket.on('end', () => {
            app.removeListener('proxy-request-info', sendProxyRequestInfoFunc);
        });

        app.on('proxy-request-info', sendProxyRequestInfoFunc);
    });
    return app;
}