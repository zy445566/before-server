import indexHtml from './index.html'
import {getQuery} from '@/components/MyRouter'
import myRequest from '@/components/MyRequest'
import HTMLContent from '@/components/HTMLContent'
export default class MyHome extends HTMLContent {
    constructor() {
        super();
        this.render(indexHtml)
        this.init();
        this.addListen();
    }
    async init() {
        const query = getQuery(this);
        this.startSocket({key:query.key})
    }

    async addListen() {
        this.shadow.querySelector(".go-back-btn").addEventListener('click',this.goHome)
        this.shadow.querySelector(".clear-btn").addEventListener('click',this.clearReq)
        this.shadow.querySelector(".fifter-text-input").addEventListener('keydown',this.changeFifter)
    }

    goHome() {
        window.location.hash='';
    }

    clearReq() {

    }

    changeFifter() {

    }
    startSocket(config) {
        this.ws = new WebSocket(`ws://${window.location.host}/`);
        this.ws.onopen = () => {
            this.ws.send(JSON.stringify(config));
        };      
        this.ws.onmessage = (evt) => { 
            JSON.parse(evt.data);
        };
    }

    disconnectedCallback() {
        if(this.ws) {
            this.ws.close()
        }
    }
}