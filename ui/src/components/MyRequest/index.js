const urlPrefix="/api"
class MyRequest {
    getParams(params={}) {
        const paramsStr = Object.entries(params).map(e=>e.join('=')).join('&');
        return paramsStr===''?'':`?${paramsStr}`
    }
    getUrl(path, params) {
        const paramsStr = this.getParams(params)
        const pathWithParams = `${path}${paramsStr}`;
        return path[0]==='/'?`${urlPrefix}${pathWithParams}`:`${urlPrefix}/${pathWithParams}`;
    }
    async get(path, params = {}) {
        const response = await fetch(this.getUrl(path, params), {
            headers: {
                'content-type': 'application/json'
            },
            method: 'GET',
        })
        return await this.doResponse(response)
    }

    async post(path, params = {}) {
        const response = await fetch(this.getUrl(path), {
            body: JSON.stringify(params),
            headers: {
                'content-type': 'application/json'
            },
            method: 'POST',
        })
        return await this.doResponse(response)
    }

    async doResponse(response) {
        const resp = await response.json()
        if(resp.errorCode) {
            throw(new Error(resp.errorCode))
        }
        return resp;
    }
}
export default new MyRequest()


