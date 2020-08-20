export default class HTMLContent extends HTMLElement {
    constructor() {
        super();
        this.shadow = null;
    }
    getRenderStr(htmlStr,dataObj={}) {
        let dataStr = ''
        for(const key of Object.keys(dataObj)) {
            dataStr+=`const ${key} = dataObj.${key};`
        }
        const compileHtml = new Function(dataStr+'return `'+htmlStr.replace(/`/g,'\\`')+'`;');
        return compileHtml();
    }
    render(htmlStr,dataObj={}) {
        if(!this.shadow) {this.shadow = this.attachShadow( { mode: 'open' } );}
        this.shadow.innerHTML = this.getRenderStr(htmlStr,dataObj);
    }

    addStyleSheets(styleSheets) {
        // this.shadowRoot.styleSheets暂时无法添加，所以只能保证成功
        const rulelist = []
        for (let i=0; i<styleSheets.length; i++) {
            const sheet = styleSheets[i];
            for (let j=0; j<sheet.cssRules.length;j++) {
                const rule = sheet.cssRules[j];
                rulelist.push(rule.cssText)
            }
        }
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = rulelist.join('\r\n')
        this.shadow.appendChild(style)
    }
  }