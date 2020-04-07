const bsConfig = require('../.bsrc.js');
const {getConfig, listenCallBack,getConfigTipString} = require('../util')
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
        socket.write('HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
                     'Upgrade: WebSocket\r\n' +
                     'Connection: Upgrade\r\n' +
                     '\r\n');
        socket.pipe(socket); // 客户端输入服务端直接返回
    });
}