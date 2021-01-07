#!/usr/bin/env node
const proxyServerStart = require('../server/proxy');
const monitorServerStart = require('../server/monitor');
const {printText} = require('../util/index')
const package = require('../package.json');

printText(`version@${package.version}`)
let koaEmitter;
proxyServerStart((data)=>{
    koaEmitter.emit('proxy-request-info', data);
});
koaEmitter = monitorServerStart();