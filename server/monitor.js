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

module.exports = function start () {
    const app = new Koa();
    app.use(koaStatic(path.join(__dirname, 'static'),{index:'index.html'}));
    app.use(router.routes())
    app.listen(bsConfig.monitorPort,listenCallBack('monitor','http',`127.0.0.1:${bsConfig.monitorPort}`))
}