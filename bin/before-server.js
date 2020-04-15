#!/usr/bin/env node
const proxyServerStart = require('../server/proxy');
const monitorServerStart = require('../server/monitor');
const package = require('../package.json');

console.log(`version@${package.version}`)
let koaEmitter;
proxyServerStart((data)=>{
    koaEmitter.emit('proxy-request-info', data);
});
koaEmitter = monitorServerStart();