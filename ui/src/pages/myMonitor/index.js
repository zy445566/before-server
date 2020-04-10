import indexHtml from './index.html'
import {getQuery} from '@/components/MyRouter'
import myRequest from '@/components/MyRequest'
import HTMLContent from '@/components/HTMLContent'
export default class MyHome extends HTMLContent {
    constructor() {
        super();
        this.render(indexHtml)
        this.init();
    }
    async init() {
        const query = getQuery(this);
        this.startSocket({key:query.key})
       
    }
    startSocket(config) {
        var ws = new WebSocket(`ws://${window.location.host}/`);
        ws.onopen = function()
        {
            ws.send(JSON.stringify(config));
        };      
        ws.onmessage = function (evt) 
        { 
            JSON.parse(evt.data);
        };
    }
}