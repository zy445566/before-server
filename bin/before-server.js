#!/usr/bin/env node
const proxyServerStart = require('../server/proxy');
const monitorServerStart = require('../server/monitor');

let koaEmitter;
proxyServerStart((data)=>{
    koaEmitter.emit('proxy-request-info', data);
});
koaEmitter = monitorServerStart();