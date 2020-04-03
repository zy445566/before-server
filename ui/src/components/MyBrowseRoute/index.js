import HTMLContent from '@/components/HTMLContent'
export default class MyBrowseRoute extends HTMLContent {
    constructor() {
        super();
        this.path = this.getAttribute('path');
        this.tag = this.getAttribute('tag');
        const html = window.location.pathname==this.path?`<${this.tag}/>`:'';
        this.render(html)
    }
  }
