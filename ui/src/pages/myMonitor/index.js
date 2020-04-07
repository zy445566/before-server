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
    }
    addListen() {

    }
}