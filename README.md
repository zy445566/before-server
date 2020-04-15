# before-server
方便查阅客户端(移动端，Web端)请求的前置服务,前端或移动端通过链接前置服务的代理地址来转发到开发或测试服务，那我们可以不需要复杂的配置抓包工具，直接打开前置服务的监控服务即可实现查看请求情况。

# 与传统开发的不同点
传统开发是客户端直连开发机来实现通讯中间没有监控http或https的工具，所以每个人都需要配置一个抓包工具，这无疑是复杂和费时的。所以我们完全可以在开发网或测试网只部署一个前置服务，并通过url来区分监控请求来实现只部署一次却能服务整个团队的抓包需求功能。

![图片说明](https://raw.githubusercontent.com/zy445566/zy445566.github.io/master/before-server/example.png)

优点：
* 只需部署一次，可通过URL区分拦截请求
* 不需要配置复杂的抓包工具，自带http和https的请求拦截
* 既可以支持个人部署，也可以支持团队部署
* 可以在相同服务器不同端口部署服务

缺点：
* 如果部署到服务器中，整个团队都可以使用

# 使用方法
## 0x1创建`.bsrc.js`文件到工作目录中
首先需要在你的工作目录中增加`.bsrc.js`文件,目录结构如下：
```
/your-work-dir
└─.bsrc.js
```
`.bsrc.js`文件内容例子如下：
```js
module.exports = {
    proxyTable:{ 
        // 这里代理的优先级，前者高于后者，如果想全访问，直接使用/即可
        '/api1': {
            target: 'http://127.0.0.1:3000' //当访问api1开头的url要代理的开发服务
        },
        '/api': {
            target: 'http://127.0.0.1:3443/apis'//当访问api开头的url要代理的开发服务
        },
        '/ws/api': {
            target: 'ws://127.0.0.1:3000/ws'//当访问/ws/api开头的url要代理的开发服务
        },
        '/ws': {
            target: 'wss://127.0.0.1:3000/ws/api'//当访问/ws开头的url要代理的开发服务
        }
    },
    httpPort:8000, // http代理服务的端口
    httpsPort:8443, // https代理服务的端口
    monitorPort:8555,// 监控服务端口服务的端口
}
```
`.bsrc.js`的默认配置如下：
```js
const fs =require('fs');
const path =require('path');
module.exports = {
    // 这是自带的证书，一般你不续要配置
    ssl: {
            key: fs.readFileSync(path.join(__dirname,'keys','key.pem'), 'utf8'),
            cert: fs.readFileSync(path.join(__dirname,'keys','cert.pem'), 'utf8')
    },
    // 默认代理墙是没有任何配置的，需要手动配置
    proxyTable:{

    },
    httpPort:8000, // http代理服务的端口
    httpsPort:8443, // https代理服务的端口
    monitorPort:8555, // 监控服务端口服务的端口
}
```
## 0x2安装全局包
```sh
# 这里也可以使用yarn
npm install before-server -g
```
# 0x3在工作目录启动服务即可
```sh
# dir: /your-work-dir
before-server
```

# 关于
Power By @Web Components
