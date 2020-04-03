import HTMLContent from '@/components/HTMLContent'
export default class MyHashRoute extends HTMLContent {
    constructor() {
        super();
        this.path = this.getAttribute('path');
        this.tag = this.getAttribute('tag');
        this.renderView()
        this.addListen();
    }
    addListen() {
        const body = document.querySelector('body')
        const beforeHashChange = body.onhashchange;
        body.onhashchange = ()=>{
            if(typeof beforeHashChange==='function'){
                beforeHashChange()
            }
            this.renderView()
        }
    }
    renderView() {
        const html = window.location.hash==this.path?`<${this.tag}/>`:'';
        this.render(html)
    }
  }
