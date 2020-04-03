export default class HTMLContent extends HTMLElement {
    shadow:ShadowRoot;
    getRenderStr(htmlStr,dataObj:any):string;
    render(htmlStr:string,dataObj:any):void;
  }