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
        console.log(getQuery(this));
        this.startSocket()
       
    }
    startSocket() {
        var ws = new WebSocket(`ws://${window.location.host}/`);
        console.log(ws)
        ws.onopen = function()
        {
            console.log("握手成功");
            ws.send("发送数据测试");
            console.log("发送数据测试");
        };      
        ws.onmessage = function (evt) 
        { 
            console.log("数据已接收...",evt.data);
        };
        ws.onclose = function()
        { 
            console.log("连接已关闭..."); 
        };
    }
}