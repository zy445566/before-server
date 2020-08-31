# before-server
方便查阅客户端(移动端，Web端SSR和小程序)请求的前置服务,前端或移动端通过链接前置服务的代理地址来转发到开发或测试服务，那我们可以不需要复杂的配置抓包工具，直接打开前置服务的监控服务即可实现查看请求情况。解决了移动端，Web端SSR和小程序无法直接通过浏览器查看请求数据的痛点。

# 与传统开发的不同点
传统开发是客户端直连开发机来实现通讯中间没有监控http或https的工具，所以每个人都需要配置一个抓包工具，这无疑是复杂和费时的。所以我们完全可以在开发网或测试网只部署一个前置服务，并通过url来区分监控请求来实现只部署一次却能服务整个团队的抓包需求功能。

![图片说明](https://raw.githubusercontent.com/zy445566/zy445566.github.io/master/before-server/example.png)

优点：
* 只需部署一次，可通过URL区分拦截请求
* 不需要配置复杂的抓包工具，自带http和https的请求拦截
* 既可以支持个人部署，也可以支持团队部署
* 可以在相同服务器不同端口部署服务
* 如果部署到服务器中，整个团队都可以使用

缺点：
* ~~转发的服务端需要支持跨域或前端开发服务修改源来保证不会有跨域问题~~(如遇跨域问题，代理配置cors即可解决)
* 前端需要修改API请求地址到代理服务地址

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
        /**
         * http://proxyhost/api1/1 
         * 代理将转发到=> 
         * http://www.aaa.com/api1/1
         */
        '/api1': {
            target: 'http://www.aaa.com', //你的测试域名,当访问代理的api1开头的url要代理的开发服务
            cors:true, // 如果要配置cors跨域可以在这里设置
            changeOrigin: true, // 如果后端对域名有识别，可以配置这个
            tag:'xxxx功能'， // 配置标签
        },
        /**
         * http://proxyhost/api2/1 
         * 此配置代理将转发到=> 
         * http://www.aaa.com/api3/api2/1 
         */
        '/api2': {
            target: 'https://www.bbb.com/api3', //当访问代理的api2开头的url要代理的开发服务
            tag:'xxxx服务'， // 配置标签
        },
        '/ws/api': {
            target: 'ws://www.ccc.com', //当访问/ws/api开头的url要代理的开发服务
            tag:'xxxxWebSockt服务'， // 配置标签
        },
        '/ws2': {
            target: 'ws://www.ddd.com', //当访问/ws2开头的url要代理的开发服务
            tag:'xxxxWebSockt2号服务'， // 配置标签
        }
    },
    httpPort:8000, // http代理服务的端口
    httpsPort:8443, // https代理服务的端口
    monitorPort:8555,// 监控服务端口服务的端口
}
```
## 0x2安装全局包
```sh
# 这里也可以使用yarn
npm install before-server -g
```
## 0x3在工作目录启动服务即可
```sh
# dir: /your-work-dir
before-server # or `npx before-server` 
```

# 功能截图

![首页](https://raw.githubusercontent.com/zy445566/zy445566.github.io/master/before-server/home.png)
![监控页面](https://raw.githubusercontent.com/zy445566/zy445566.github.io/master/before-server/monitor.png)


# `.bsrc.js`文件的默认配置
以下是`.bsrc.js`文件的默认配置，手动配置项会合并进默认配置项
```js
const fs =require('fs');
const path =require('path');
module.exports = {
    // 这是自带的证书，一般你不需要配置
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
    HistoryNumber:300, // 总历史记录上限，存在服务内存中，重启服务内存重置
}
```


# 关于
通过代理请求实现请求监控的工具，解决了移动端、Web端SSR、小程序很多请求无法直接通过浏览器查看请求数据的痛点。

Docker镜像仓库: https://github.com/zy445566/before-server-images

Power By @Web Components
