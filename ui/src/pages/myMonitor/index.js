import indexHtml from './index.html'
import {getQuery} from '@/components/MyRouter'
import apiMarkDownTemplate from './api-template.md'
import HTMLContent from '@/components/HTMLContent'
export default class MyHome extends HTMLContent {
    constructor() {
        super();
        this.ws = null;
        this.key = '';
        this.reqList = []
        this.showReqList = [];
        this.fifterText = '';
        this.render(indexHtml)
        this.init();
        this.addListen();
    }
    async init() {
        const query = getQuery(this);
        this.key = query.key;
        try{
            const reqData = JSON.parse(localStorage.getItem(this.getDataKey(this.key)));
            this.reqList = reqData?reqData:[];
            this.reRenderShow()
        } catch(err) {
            this.reqList = []
        }
        this.startSocket({key:query.key})
    }

    getDataKey(key) {
        return `reqdata:${key}`
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
            const completeUrl = new URL(`${data.req.target}${data.req.url}`);
            let badge = '';
            if(data.res.statusCode<300) {
                badge = '<span class="badge badge-pill badge-success">success</span>'
            } else if(data.res.statusCode<400) {
                badge = '<span class="badge badge-pill badge-warning">warning</span>'
            } else {
                badge = '<span class="badge badge-pill badge-danger">danger</span>'
            }
            reqItemTemplateContent.querySelector(".req-item").innerHTML = badge + completeUrl.pathname;
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
        const reqBodyTemplate = this.shadow.querySelector("#req-body-template");
        let reqBodyTemplateContent = reqBodyTemplate.content.cloneNode(true);
        // 添加通用状态
        const generalUl = reqBodyTemplateContent.querySelector(".general-header-data")
        const requestUrlLi = document.createElement('li');
        requestUrlLi.innerHTML = `请求地址 : ${data.req.target}${data.req.url}`;
        generalUl.appendChild(requestUrlLi)
        const requestMethodLi = document.createElement('li');
        requestMethodLi.innerHTML = `请求方式 : ${data.req.method}`;
        generalUl.appendChild(requestMethodLi)
        const requestStatusLi = document.createElement('li');
        requestStatusLi.innerHTML = `状态 : HTTP ${data.req.httpVersion} ${data.res.statusCode}`;
        generalUl.appendChild(requestStatusLi)
        const requestTimeLi = document.createElement('li');
        requestTimeLi.innerHTML = `消耗时间 : ${data.req.time} ms`;
        generalUl.appendChild(requestTimeLi)
        const downloadApiMarkdownBtn = reqBodyTemplateContent.querySelector(".download-api-markdown");
        downloadApiMarkdownBtn.addEventListener('click',(event)=>{this.downloadApiMarkdown(data)})
        // 添加请求头
        const reqUl = reqBodyTemplateContent.querySelector(".req-header-data")
        this.addHeadersToUl(data.req.headers,reqUl);
        // 添加请求数据
        const reqPre = reqBodyTemplateContent.querySelector(".req-body-data")
        this.addBodyToPre(data.req.body,reqPre)
        // 添加返回头
        const resUl = reqBodyTemplateContent.querySelector(".res-header-data")
        this.addHeadersToUl(data.res.headers,resUl);
        // 添加返回数据
        const resPre = reqBodyTemplateContent.querySelector(".res-body-data")
        this.addBodyToPre(data.res.body,resPre)
        // 向右侧body推数据
        const reqBody = this.shadow.querySelector(".req-body");
        reqBody.innerHTML = ''
        reqBody.appendChild(reqBodyTemplateContent)
    }

    addHeadersToUl(headers,ulEle) {
        for(const key of Object.keys(headers)) {
            const headerLi = document.createElement('li');
            headerLi.innerHTML = `${key} : ${headers[key]}`;
            ulEle.appendChild(headerLi)
        }
    }

    addBodyToPre(strBody, preEle) {
        preEle.innerHTML = this.getBodyDataStr(strBody);
    }

    getBodyDataStr(strBody) {
        if(!strBody) {return  '无数据'}
        try{
            return JSON.stringify(JSON.parse(strBody),null,2)
        } catch(err) {
            return strBody
        }
    }

    downloadApiMarkdown(data) {
        const renderData = {}
        const completeUrl = new URL(`${data.req.target}${data.req.url}`);
        const pathnameList = completeUrl.pathname.split('/');
        renderData.title = pathnameList[pathnameList.length-1];
        renderData.method = data.req.method;
        if(renderData.method.toLowerCase()==='get') {
            renderData.url = completeUrl.pathname;
            renderData.paramsData = completeUrl.search
        } else {
            renderData.url = data.req.url
            renderData.paramsData = this.getBodyDataStr(data.req.body)
        }
        renderData.resData = this.getBodyDataStr(data.res.body);
        const downloadA = document.createElement('a')
        downloadA.download = `${renderData.title}.md`
        downloadA.style.display = 'none';
        const downloadStrData = eval('`'+apiMarkDownTemplate.replace(/`/g,'\\`')+'`;')
        const blob = new Blob([downloadStrData])
        downloadA.href = URL.createObjectURL(blob)
        this.shadow.appendChild(downloadA)
        downloadA.click()
        this.shadow.removeChild(downloadA)
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
        localStorage.setItem(this.getDataKey(this.key),JSON.stringify(this.reqList))
    }
}