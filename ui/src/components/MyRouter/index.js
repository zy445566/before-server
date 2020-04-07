import HTMLContent from '@/components/HTMLContent'
export default class MyRouter extends HTMLContent {
    constructor() {
        super();
    }
}

export function getQuery(routeDom) {
    const routeType = routeDom.getAttribute('route-type');
    let queryList = []
    switch(routeType) {
        case 'browse':
            queryList = window.location.pathname.split("?");
            queryList.shift()
            break;
        case 'hash':
            queryList = window.location.hash.split("?");
            queryList.shift()
            break;
        default:
            break;
    }
    const queryDataList = queryList.map((e)=>{
        const data = e.split('=')
        return {
            key:data[0],
            value:data[1],
        }
    });
    const queryObj = {}
    for(const queryData of queryDataList) {
        queryObj[queryData.key] = queryData.value;
    }
    return queryObj
}