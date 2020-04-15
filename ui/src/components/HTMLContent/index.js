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
        return eval(dataStr+'`'+htmlStr.replace(/`/g,'\\`')+'`;');
    }
    render(htmlStr,dataObj={}) {
        if(!this.shadow) {this.shadow = this.attachShadow( { mode: 'closed' } );}
        this.shadow.innerHTML = this.getRenderStr(htmlStr,dataObj);
    }
  }