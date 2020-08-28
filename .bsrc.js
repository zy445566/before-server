const fs =require('fs');
const path =require('path');
module.exports = {
    ssl: {
            key: fs.readFileSync(path.join(__dirname,'keys','key.pem'), 'utf8'),
            cert: fs.readFileSync(path.join(__dirname,'keys','cert.pem'), 'utf8')
    },
    proxyTable:{
    },
    httpPort:8000,
    httpsPort:8443,
    monitorPort:8555,
    HistoryNumber:1000,
}