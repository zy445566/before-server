import indexHtml from './index.html'
import myRequest from '@/components/MyRequest'
import HTMLContent from '@/components/HTMLContent'
export default class MyHome extends HTMLContent {
    constructor() {
        super();
        this.render(indexHtml);
        this.addStyleSheets(document.styleSheets);
        this.init();
    }
    async init() {
        const resp = await myRequest.get('/get_config');
        const headContainer = this.shadow.querySelector(".my-haed");
        headContainer.querySelector('.lead').innerHTML = `前端通过连接代理服务(
            http://${window.location.hostname}:${resp.httpPort}或https://${window.location.hostname}:${resp.httpsPort}
        )，实现监控并转发URL到下面服务地址。<br/><a href="https://github.com/zy445566/before-server">before-server源码地址</a>`
        const mainContainer = this.shadow.querySelector(".my-main");
        const proxyKeys = Object.keys(resp.proxyTable);
        if(proxyKeys.length>0) {
            const myRowTemplate = this.shadow.querySelector("#my-row");
            for(const proxyKey of proxyKeys) {
                let myRowTemplateContent = myRowTemplate.content.cloneNode(true);
                myRowTemplateContent.querySelector(".before-text").innerHTML = `转发(URL:${proxyKey})到:`
                myRowTemplateContent.querySelector(".url-input").value = resp.proxyTable[proxyKey].target;
                myRowTemplateContent.querySelector(".go-monitor-btn").addEventListener('click',()=>{
                    window.location.hash=`#my-monitor?key=${proxyKey}`;
                })
                mainContainer.appendChild(myRowTemplateContent)
            }
            const lastRowTemplate = this.shadow.querySelector("#last-row");
            let lastRowTemplateContent = lastRowTemplate.content.cloneNode(true);
            lastRowTemplateContent.querySelector(".go-monitor-btn").addEventListener('click',()=>{
                window.location.hash=`#my-monitor?key=`;
            })
            mainContainer.appendChild(lastRowTemplateContent)
        } else {
            const resp = await myRequest.get('/get_config_tip');
            const myCardTemplate = this.shadow.querySelector("#my-card");
            let myCardTemplateContent = myCardTemplate.content.cloneNode(true);
            myCardTemplateContent.querySelector(".plain-text").innerHTML = resp.tip;
            mainContainer.appendChild(myCardTemplateContent)
        }
    }

}