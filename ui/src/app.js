import appHtml from '@/app.html'
import {HTMLContent, MyHashRoute, MyRouter} from 'web-components-content'
import MyHome from '@/pages/MyHome/index.js'
import myMonitor from '@/pages/myMonitor/index.js'
class AppContainer extends HTMLContent {
    constructor() {
        super();
        this.render(appHtml)
        this.addStyleSheets(document.styleSheets)
    }
}
window.customElements.define('app-container', AppContainer);
window.customElements.define('my-home', MyHome);
window.customElements.define('my-monitor', myMonitor);
window.customElements.define('my-router', MyRouter);
window.customElements.define('my-hash-route', MyHashRoute);
