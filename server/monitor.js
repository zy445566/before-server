const bsConfig = require('../.bsrc.js');
const path = require('path');
const {listenCallBack,getConfigTipString} = require('../util')
const Koa = require('koa');
const koaStatic = require('koa-static');
const koaRouter = require('koa-router');
const router = new koaRouter({
    prefix: '/api'
})

module.exports = function start () {
    const app = new Koa();
    app.use(koaStatic(path.join(__dirname, 'static'),{index:'index.html'}));
    app.use(router.routes())
    app.listen(bsConfig.monitorPort,listenCallBack('monitor','http',`127.0.0.1:${bsConfig.monitorPort}`))
}