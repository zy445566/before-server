const fs =require('fs');
const path =require('path');
const crypto =require('crypto');
const util = require('util');
const fileWriteFile = util.promisify(fs.writeFile);
const fileReaddir = util.promisify(fs.readdir);
const fileUnlink = util.promisify(fs.unlink);
const fileStat = util.promisify(fs.stat);
const zlib = require('zlib');

function getStaticPath () {
    return path.join(path.dirname(__dirname), 'server','static');
}
function hash256 (data,encoding='hex') {
    return crypto.createHash('sha256').update(data).digest(encoding);
}
module.exports.listenCallBack = function(type,protocol,hostname) {
    return ()=>{
        if(type==='proxy') {
            console.log(`${type} ${protocol} server listening ${protocol}://${hostname}/`)
        } else {
            console.log(`${type} server listening ${protocol}://${hostname}/`)
        }
        
    }
}

module.exports.hash256 = hash256;

module.exports.writeDataToFile = async function(bufList,type) {
    const data = Buffer.concat(bufList);
    const showPath = `${type}/${hash256(data)}.log`;
    const filePath = path.join(getStaticPath(),showPath)
    await fileWriteFile(filePath,data);
    return showPath;
    
}
module.exports.clearFileData = async function(clearFileTime) {
    try{
        const nowTime = new Date().getTime();
        const typeList=['req','res'];
        for(type of typeList) {
            const fileDir = path.join(getStaticPath(),type);
            const fileList = await fileReaddir(fileDir);
            for(const fileName of fileList) {
                if(fileName!=='.gitkeep') {
                    const filePath = path.join(fileDir,fileName);
                    const stat = await fileStat(filePath);
                    if((stat.birthtime.getTime()+clearFileTime)<nowTime) {
                        await fileUnlink(filePath);
                    }
                }
            }
        }
        return true;
    } catch(err) {
        return false;
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
    for(let i=0;i<proxyTableKeys.length;i++) {
        if(url.indexOf(proxyTableKeys[i])>=0) {
            index = i;
            return index;
        }
    }
    return index;
}
const configTpStr = fs.readFileSync(path.join(__dirname,'config.tp')).toString();
module.exports.getConfigTipString = function() {
    return `请配置工作目录的.bsrc.js文件(${process.cwd()}${path.sep}.bsrc.js)配置项proxyTable后重启服务，例子如下\n\n`+configTpStr;
}


module.exports.createPathRewriter =  function createPathRewriter(rewriteConfig) {
    let rulesCache;
  
    if (typeof rewriteConfig === 'function') {
      const customRewriteFn = rewriteConfig;
      return customRewriteFn;
    } else {
      rulesCache = parsePathRewriteRules(rewriteConfig);
      return rewritePath;
    }
  
    function rewritePath(path) {
      let result = path;
      for(const rule of rulesCache) {
        if (rule.regex.test(path)) {
            result = result.replace(rule.regex, rule.value);
            break;
          }
      }
      return result;
    }
}

function parsePathRewriteRules(rewriteConfig) {
    const rules = [];
    for(const key in rewriteConfig) {
        rules.push({
            regex: new RegExp(key),
            value: rewriteConfig[key],
        });
    }
    return rules;
  }

module.exports.getStaticPath = getStaticPath;

module.exports.decompressBody = function(res, buffer) {
    if(!res.headers) {return buffer;}
    const headerList = Object.keys(res.headers);
    let contentEncoding = null;
    for(const header of headerList){
        if(String(header).toLowerCase()==='content-encoding') {
            contentEncoding = String(res.headers[header]).toLowerCase();
            break;
        }
    }
    if(!contentEncoding){return buffer;}
    switch(contentEncoding) {
        case 'br':
            return zlib.brotliDecompressSync(buffer)
        case 'gzip':
            return zlib.gunzipSync(buffer)
        case 'deflate':
            return zlib.inflateSync(buffer)
    }
    return buffer;
}
