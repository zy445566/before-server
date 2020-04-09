import indexHtml from './index.html'
import myRequest from '@/components/MyRequest'
import HTMLContent from '@/components/HTMLContent'
export default class MyHome extends HTMLContent {
    constructor() {
        super();
        this.render(indexHtml)
        this.init();
    }
    async init() {
        const resp = await myRequest.get('/get_config');
        const headContainer = this.shadow.querySelector(".my-haed");
        headContainer.querySelector('.lead').innerHTML = `通过连接代理服务(
            http://127.0.0.1:${resp.httpPort}或https://127.0.0.1:${resp.httpsPort}
        )，监控并转发URL到下面服务地址`
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
        } else {
            const resp = await myRequest.get('/get_config_tip');
            const myCardTemplate = this.shadow.querySelector("#my-card");
            let myCardTemplateContent = myCardTemplate.content.cloneNode(true);
            myCardTemplateContent.querySelector(".plain-text").innerHTML = resp.tip;
            mainContainer.appendChild(myCardTemplateContent)
        }
    }

}