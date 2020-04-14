import indexHtml from './index.html'
import {getQuery} from '@/components/MyRouter'
import myRequest from '@/components/MyRequest'
import HTMLContent from '@/components/HTMLContent'
export default class MyHome extends HTMLContent {
    constructor() {
        super();
        this.ws = null;
        this.reqList = []
        this.showReqList = [];
        this.fifterText = '';
        this.render(indexHtml)
        this.init();
        this.addListen();
    }
    async init() {
        const query = getQuery(this);
        this.startSocket({key:query.key})
    }

    async addListen() {
        this.shadow.querySelector(".go-back-btn").addEventListener('click',(e)=>this.goHome(e))
        this.shadow.querySelector(".clear-btn").addEventListener('click',(e)=>this.clearReq(e))
        this.shadow.querySelector(".fifter-text-input").addEventListener('keyup',(e)=>this.changeFifter(e))
    }

    goHome() {
        window.location.hash='';
    }

    clearReq() {
        this.reqList = [];
        this.reRenderShow();
    }

    changeFifter(e) {
        this.fifterText = e.target.value;
        this.reRenderShow();
    }

    reRenderShow() {
        this.showReqList = this.reqList.filter((data)=>{
            return data.req.url.indexOf(this.fifterText)>-1;
        })
        const reqListDom = this.shadow.querySelector(".req-list");
        reqListDom.innerHTML = '';
        this.showReqList.map((data)=>{
            const reqItemTemplate = this.shadow.querySelector("#req-item-template");
            let reqItemTemplateContent = reqItemTemplate.content.cloneNode(true);
            const completeUrl = new URL(`${data.req.host}${data.req.url}`);
            reqItemTemplateContent.querySelector(".req-item").innerHTML = completeUrl.pathname;
            reqItemTemplateContent.querySelector(".req-item").addEventListener('click',(event)=>{
                for(const e of reqListDom.children) {e.className = e.className.replace('active','')}
                if(event.target.className.indexOf('active')==-1) {
                    event.target.className += ' active'
                }
                this.showBody(data);
            })
            reqListDom.appendChild(reqItemTemplateContent)
        })
        // url innerhtml showReqList
    }

    showBody(data) {
        const reqBody = this.shadow.querySelector(".req-body");
        reqBody.innerHTML = JSON.stringify(data,null,2)
    }

    startSocket(config) {
        this.ws = new WebSocket(`ws://${window.location.host}/`);
        this.ws.onopen = () => {
            this.ws.send(JSON.stringify(config));
        };      
        this.ws.onmessage = (evt) => {
            this.reqList.push(JSON.parse(evt.data));
            this.reRenderShow()
        };
    }

    disconnectedCallback() {
        if(this.ws) {
            this.ws.close()
        }
    }
}