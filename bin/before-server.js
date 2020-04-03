#!/usr/bin/env node
const proxyServerStart = require('../server/proxy');
const monitorServerStart = require('../server/monitor');

proxyServerStart();
monitorServerStart();