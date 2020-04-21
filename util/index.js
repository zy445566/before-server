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
const configTpStr = fs.readFileSync(path.join(__dirname,'config.tp')).toString();
module.exports.getConfigTipString = function() {
    return `请配置当前工作目录的.bsrc.js文件(${process.cwd()}${path.sep}.bsrc.js)配置项proxyTable后重启服务，例子如下\n\n`+configTpStr;
}
