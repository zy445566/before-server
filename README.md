# before-server
方便查阅客户端(移动端，Web端SSR和小程序)请求的前置服务,前端或移动端通过链接前置服务的代理地址来转发到开发或测试服务，那我们可以不需要复杂的配置抓包工具，不需要为手机或电脑等设备单独设置代理，而直接打开前置服务的监控服务即可实现查看请求情况。解决了移动端，Web端SSR和小程序无法直接通过浏览器查看请求数据的痛点和需要为每台设备配置抓包代理的痛点。

# 与传统开发的不同点
传统开发是客户端直连开发机来实现通讯中间没有监控http或https的工具，所以每个人都需要配置一个抓包工具，同时还要为每台手机或电脑配置代理服务，这无疑是复杂和费时的。所以我们完全可以在开发网或测试网只部署一个直连前置服务，并通过url来区分监控请求来实现只部署一次却能服务整个团队的抓包需求功能，而这唯一的代价仅仅是前端项目修改API接口的请求地址。

![图片说明](https://raw.githubusercontent.com/zy445566/zy445566.github.io/master/before-server/example.jpg)

优点：
* 只需部署一次，可通过URL区分拦截请求
* 不需要配置复杂的抓包工具，自带http和https的请求拦截
* 不需要为手机或电脑等设备单独设置代理
* 既可以支持个人部署，也可以支持团队部署
* 可以在相同服务器不同端口部署服务
* 如果部署到服务器中，整个团队都可以使用

缺点：
* 前端需要修改API请求地址到代理服务地址

# 使用方法
## 0x1 创建`.bsrc.js`文件到工作目录中
首先需要在你的工作目录中增加`.bsrc.js`文件,目录结构如下：
```
/your-work-dir
└─.bsrc.js
```
最小`.bsrc.js`文件配置例子如下(和webpack-dev-server的proxyTable配置基本类似。[点此查看配置文件相对全面的例子](#配置文件相对全面的例子))：
```js
module.exports = {
    proxyTable:{
        '/': {
            // 比如后端API接口地址为http://api.test.com:7001,这里需要配置你的后端API地址
            target: 'http://api.test.com:7001', // 服务端API接口
            changeOrigin: true, // 如果后端对域名有识别，可以配置这个
            tag:'API服务'， // 配置标签
        }
    },
    httpPort:8000
}
```
## 0x2 安装全局包
```sh
# 这里也可以使用yarn
npm install before-server -g
```
## 0x3 在工作目录启动服务
```sh
# dir: /your-work-dir
before-server # 或者 `npx before-server`
# 也可以使用pm2启动，如 pm2 start before-server # 但注意pm2需要在配置文件目录启动
```

## 0x4 修改前端项目的API接口请求地址
最后前端(包括移动端和web端以及小程序端)修改请求API接口地址到前置服务，默认http为8000端口,默认https为8443。

比如.bsrc.js配置为如下时:
```js
module.exports = {
    proxyTable:{
        '/': {
            // 比如后端API接口地址为http://api.test.com:7001,这里需要配置你的后端API地址
            target: 'http://api.test.com:7001', // 服务端API接口
            changeOrigin: true, // 如果后端对域名有识别，可以配置这个
            tag:'根服务'， // 配置标签
        }
    },
    httpPort:8000
}
```
修改你的前端项目的请求API接口地址，如上面配置例子则修改API接口地址为8000，
```sh
# API_HOST:http://api.test.com:7001 # 比如原来前端项目是请求http://api.test.com:7001来获取接口数据的
API_HOST:http://127.0.0.1:8000 # 如本地启动服务可直接访问127.0.0.1:8000，建议部署到服务器中
```

完成以上工作后，就可以使用浏览器打开8555端口的UI界面，来查看发送的请求。

注意如果使用nginx反向代理需要配置支持8555端口使用WebStocket功能。

# 功能截图

![首页](https://raw.githubusercontent.com/zy445566/zy445566.github.io/master/before-server/home.png)
![监控页面](https://raw.githubusercontent.com/zy445566/zy445566.github.io/master/before-server/monitor.png)

# 配置文件的默认配置
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

# 配置文件相对全面的例子
相对全面的`.bsrc.js`文件例子如下：
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
            secure:false, // 对于自签证书则需要配置secure忽略证书无效
            tag:'xxxx服务'， // 配置标签
        },
        '/ws/api': {
            target: 'ws://www.ccc.com', //当访问/ws/api开头的url要代理的开发服务
            tag:'xxxxWebSockt服务'， // 配置标签
        },
        '/ws2': {
            target: 'ws://www.ddd.com', //当访问/ws2开头的url要代理的开发服务
            tag:'xxxxWebSockt2号服务'， // 配置标签
        },
        '/log': {
            target: 'ws://www.eee.com', //重写服务地址示例
            tag:'重写服务'， // 配置标签
            pathRewrite: {
                "^/log": "", // 此时当访问/log/xxx时，会修改请求到/xxx
            },
        },
        /**
         * 最好配置一下根服务，这样的话如果都不能匹配到，还可以直接匹配到根服务
         * before-server匹配的优先级是从上到下，所以根建议配置到最下面
         * 这样监控全部就能发挥最大功力了
         */
        '/': {
            target: 'http://www.aaa.com', 
            tag:'根服务'， // 配置标签
        }
    },
    httpPort:8000, // http代理服务的端口
    httpsPort:8443, // https代理服务的端口
    monitorPort:8555,// 监控服务页面服务端口，可以通过这个端口打开UI界面
}
```

# 关于
通过代理请求实现请求监控的工具，解决了移动端、Web端SSR、小程序很多请求无法直接通过浏览器查看请求数据的痛点。

Power By @Web Components
