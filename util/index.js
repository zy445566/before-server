const fs =require('fs');
const path =require('path');
module.exports.listenCallBack = function(type,protocol,hostname) {
    return ()=>{
        console.log(`${type} server listening ${protocol}://${hostname}/`)
    }
}

module.exports.getConfig = function() {
    const configPath = path.join(process.cwd(),'.bsrc.js');
    if(fs.existsSync(configPath)) {
        return require(configPath)
    }
    return {}
}

module.exports.matchProxyTableKeysUrlIndex = function(url,proxyTableKeys=[]) {
    let index = -1
    for(const key of proxyTableKeys) {
        index = url.indexOf(key);
        if(index>=0) {
            return index;
        }
    }
    return index;
}

module.exports.getConfigTipString = function() {
    return `请配置当前工作目录的.bsrc.js文件(${process.cwd()}${path.sep}.bsrc.js)配置项proxyTable后重启服务，例子如下\n\n` +JSON.stringify({
        proxyTable:{
            /**
             * http://proxyhost/api1/1 
             * 代理将转发到=> 
             * http://www.aaa.com/api1/1
             */
            '/api1': {
                target: 'http://www.aaa.com'
            },
            /**
             * http://proxyhost/api2/1 
             * 此配置代理将转发到=> 
             * http://www.aaa.com/api3/api2/1 
             */
            '/api2': {
                target: 'https://www.bbb.com/api3'
            },
            '/ws1': {
                target: 'ws://www.ccc.com'
            },
            '/ws2': {
                target: 'wss://www.ddd.com'
            }
        }
    },null,2)
}
