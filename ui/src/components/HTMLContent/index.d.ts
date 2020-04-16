export default class HTMLContent extends HTMLElement {
    shadow:ShadowRoot;
    getRenderStr(htmlStr,dataObj:any):string;
    render(htmlStr:string,dataObj:any):void;
    connectedCallback():void; // 生命周期-当自定义元素首次连接到文档的DOM时调用。
    disconnectedCallback():void; // 生命周期-当自定义元素与文档的DOM断开连接时调用。
    adoptedCallback():void;// 生命周期-当自定义元素移到新文档时调用。
    attributeChangedCallback():void;// 生命周期-删除或更改自定义元素的属性之一时调用。
    addStyleSheets(styleSheets:Array<StyleSheet>):void;
  }