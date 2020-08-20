import HTMLContent from '@/components/HTMLContent/index.js'
export default class MyHashRoute extends HTMLContent {
    constructor() {
        super();
        this.path = this.getAttribute('path');
        this.tag = this.getAttribute('tag');
        this.routeType = 'hash'
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
        const html = window.location.hash.split("?")[0]==this.path?`<${this.tag} route-type="${this.routeType}"/>`:'';
        this.render(html)
    }
  }
