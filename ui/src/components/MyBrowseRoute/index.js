import HTMLContent from '@/components/HTMLContent'
export default class MyBrowseRoute extends HTMLContent {
    constructor() {
        super();
        this.path = this.getAttribute('path');
        this.tag = this.getAttribute('tag');
        this.routeType = 'browse'
        const html = window.location.pathname.split("?")[0]==this.path?`<${this.tag} route-type="${this.routeType}"/>`:'';
        this.render(html)
    }
  }
