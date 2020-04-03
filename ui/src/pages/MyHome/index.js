import indexHtml from './index.html'
import HTMLContent from '@/components/HTMLContent'
export default class MyHome extends HTMLContent {
    constructor() {
        super();
        this.render(indexHtml)
        this.addListen()
    }
    addListen() {

    }
}