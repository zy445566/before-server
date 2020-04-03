import appHtml from '@/app.html'
import HTMLContent from '@/components/HTMLContent'
import MyHashRoute from '@/components/MyHashRoute'
import MyRouter from '@/components/MyRouter'
import MyHome from '@/pages/MyHome'
class AppContainer extends HTMLContent {
    constructor() {
        super();
        this.render(appHtml)
    }
}
window.customElements.define('app-container', AppContainer);
window.customElements.define('my-home', MyHome);
window.customElements.define('my-router', MyRouter);
window.customElements.define('my-hash-route', MyHashRoute);
