import indexHtml from './index.html'
import {HTMLContent, MyRouter} from 'web-components-content'
const {getQuery} = MyRouter;
import apiMarkDownTemplate from './api-template.md'
import * as prismjs from 'prismjs'
import * as _prismjsJson  from 'prismjs/components/prism-json';
export default class myMonitor extends HTMLContent {
    connectedCallback() {
        this.ws = null;
        this.key = '';
        this.reqList = []
        this.showReqList = [];
        this.fifterText = '';
        this.render(indexHtml);
        this.addStyleSheets(document.styleSheets);
        this.init();
        this.addListen();
    }
    async init() {
        const query = getQuery(this);
        this.key = query.key;
        this.reqList = []
        this.startSocket({key:query.key})
    }

    getDataKey(key) {
        return `reqdata:${key}`
    }

    async addListen() {
        this.shadow.querySelector(".go-back-btn").addEventListener('click',(e)=>this.goHome(e))
        this.shadow.querySelector(".history-btn").addEventListener('click',(e)=>this.getHistory(e))
        this.shadow.querySelector(".clear-btn").addEventListener('click',(e)=>this.clearReq(e))
        this.shadow.querySelector(".fifter-text-input").addEventListener('keyup',(e)=>this.changeFifter(e))
    }

    goHome() {
        window.location.hash='';
    }

    getHistory() {
        this.reqList = [];
        this.ws.send(JSON.stringify({type:'history'}));
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
                badge = `<span class="badge badge-pill badge-success">${data.res.statusCode}</span>`
            } else if(data.res.statusCode<400) {
                badge = `<span class="badge badge-pill badge-warning">${data.res.statusCode}</span>`
            } else {
                badge = `<span class="badge badge-pill badge-danger">${data.res.statusCode}</span>`
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
        const requestRewriteUrlLi = document.createElement('li');
        requestRewriteUrlLi.innerHTML = `重写后地址 : ${data.req.target}${data.req.rewrite_url}`;
        generalUl.appendChild(requestRewriteUrlLi)
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
        const reqDownLoadBtn = reqBodyTemplateContent.querySelector(".req-body-data-download");
        if(data.req.bodyBuffer.data && data.req.bodyBuffer.data.length>0) {
            reqDownLoadBtn.href = this.bufferToBlobUrl(data.req.bodyBuffer.data);
            reqDownLoadBtn.style.display = 'inline';
        }
        const reqDiv= reqBodyTemplateContent.querySelector(".req-body-data");
        const reqJsonPrettyCode = this.getJsonPrettyCode(this.getJsonBodyData(data.req.body));
        if(reqJsonPrettyCode.isJson) {
            reqDiv.innerHTML = reqJsonPrettyCode.body;
        } else {
            reqDiv.textContent = reqJsonPrettyCode.body;
        }
        
        // 添加返回头
        const resUl = reqBodyTemplateContent.querySelector(".res-header-data")
        this.addHeadersToUl(data.res.headers,resUl);
        // 添加返回数据
        const resDownLoadBtn = reqBodyTemplateContent.querySelector(".res-body-data-download");
        if(data.res.bodyBuffer.data && data.res.bodyBuffer.data.length>0) {
            resDownLoadBtn.href = this.bufferToBlobUrl(data.res.bodyBuffer.data);
            resDownLoadBtn.style.display = 'inline';
        }
        const resDiv = reqBodyTemplateContent.querySelector(".res-body-data")
        const resJsonPrettyCode= this.getJsonPrettyCode(this.getJsonBodyData(data.res.body));
        if(resJsonPrettyCode.isJson) {
            resDiv.innerHTML = resJsonPrettyCode.body;
        } else {
            resDiv.textContent = resJsonPrettyCode.body;
        }
        // 向右侧body推数据
        const reqBody = this.shadow.querySelector(".req-body");
        reqBody.innerHTML = ''
        reqBody.appendChild(reqBodyTemplateContent)
    }

    bufferToBlobUrl(buffer,type='application/octet-stream') {
        const fileBlob = new Blob([new Uint8Array(buffer)],{type});
        return URL.createObjectURL(fileBlob);
    }

    addHeadersToUl(headers,ulEle) {
        for(const key of Object.keys(headers)) {
            const headerLi = document.createElement('li');
            headerLi.innerHTML = `${key} : ${headers[key]}`;
            ulEle.appendChild(headerLi)
        }
    }

    getJsonPrettyCode(jsonBodyData) {
        if(jsonBodyData.isJson) {
            jsonBodyData.body = prismjs.highlight(jsonBodyData.body,prismjs.languages.json,'json');
        }
        return jsonBodyData;
    }

    getJsonBodyData(strBody) {
        const data = {
            isJson:false,
            body:strBody
        }
        if(!strBody) {
            data.body = '无数据'
            return  data;
        }
        try{
            data.body = JSON.stringify(JSON.parse(strBody),null,2);
            data.isJson = true;
            return data;
        } catch(err) {
            return data;
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
            renderData.paramsData = this.getJsonBodyData(completeUrl.search);
        } else {
            renderData.url = data.req.url;
            renderData.paramsData = this.getJsonBodyData(data.req.body);
        }
        renderData.paramsData.lang = renderData.paramsData.isJson?'json':'';
        renderData.resData = this.getJsonBodyData(data.res.body);
        renderData.resData.lang = renderData.resData.isJson?'json':'';
        const downloadA = document.createElement('a')
        downloadA.download = `${renderData.title}.md`
        downloadA.style.display = 'none';
        const compileApiMarkDownTemplate= new Function('renderData', 'return `'+apiMarkDownTemplate.replace(/`/g,'\\`')+'`;');
        const blob = new Blob([compileApiMarkDownTemplate(renderData)])
        downloadA.href = URL.createObjectURL(blob)
        this.shadow.appendChild(downloadA)
        downloadA.click()
        this.shadow.removeChild(downloadA)
    }

    startSocket(config) {
        this.ws = new WebSocket(`ws://${window.location.host}/`);
        this.ws.onopen = () => {
            this.ws.send(JSON.stringify({type:'config', config}));
        };
        this.ws.pingIntervalHandle = setInterval(()=>{
            this.ws.send(JSON.stringify({type:'ping'}));
        },5000)
        this.ws.onmessage = (evt) => {
            this.reqList.push(JSON.parse(evt.data));
            this.reRenderShow()
        };
        this.ws.onclose = () => {
            if(!this.ws.closeBySelf) {
                if(confirm('连接已断开是否重连?'+
                '\r\n可能是太久没有使用到资源，也可能是网络不佳导致关闭了。'+
                '\r\n如果您是第一次使用，还可能是您使用了请求转发没有配置支持websocket。')){
                    clearInterval(this.ws.pingIntervalHandle);
                    this.startSocket(config);
                } else {
                    this.goHome()
                }
            }
        };
    }

    disconnectedCallback() {
        if(this.ws) {
            this.ws.closeBySelf = true;
            clearInterval(this.ws.pingIntervalHandle);
            this.ws.close();
        }
    }
}