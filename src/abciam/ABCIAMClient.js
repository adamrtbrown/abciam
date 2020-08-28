class ABCIAMClient {
    constructor(config) {
        this.accessTokenData = null;
        this.refreshTokenData = null;
        //this.cookie_root = cookie_root ?? window.document;
        this.cookie_root = window.document;
        this.serverURL = (config.url) ? config.url : "";
        this.resource = (config.resource) ? config.resource : "token";
    }
    get isLoggedIn() {
        if(this.refreshTokenData === null) {
            return false;
        }
        return !this.isTokenExpired(this.refreshToken);
    }

    get provider() {
        let decoded = this.decode(this.refreshToken);
        return decoded.payload.provider;
    }
    
    async login(id_token, provider){
        let url = this.serverURL + this.resource;
        url += "?id_token=" + encodeURIComponent(id_token);
        url += "&provider=" + encodeURIComponent(provider);

        let response = await fetch(url);
        let data = await response.json();
        if(data.refreshToken === undefined) {
            return;
        }
        if (data) {
            this.refreshToken = data.refreshToken;
            this.accessToken = data.accessToken;
        }
        console.log("logged In via ", provider);
    }
    async logout(all) {
        let url = this.serverURL + this.resource;
        let config = {
            method: "delete",
            headers: {
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify({'token': this.refreshToken, 'all': all}),
        }
        let response = await fetch(url, config);
        this.setCookieValue("refresh", "", 0);
        this.setCookieValue("access", "", 0);
        console.log("logged out");

    }
    async refresh() {
        let url = this.serverURL + this.resource;
        //let response = await axios.post(url, {'token': this.refreshToken});
        let config = {
            method: "POST",
            body: JSON.stringify({'token': this.refreshToken}),
        }
        let response = await fetch(url, config)
        let data = response.json();
        if(this.refreshToken !== null) {
            this.refreshToken = data.refreshToken;
        }
        return {
            refresh: data.refreshToken
        }
    }
    
    async request(config) {
        if (!this.isTokenExpired(this.refreshToken)) {
            if(this.isTokenExpired(this.accessToken) || this.isTokenExpired(this.refreshToken, 30 * 60)) {
                await this.refresh();
            }
        } else {
            //signal logged out, event?
        }
        
        if(!config.headers){
            config.headers = {'Content-Type': 'application/json'};
        }
        config.headers.Authorization = "Bearer " + this.accessToken;
        
        let url = this.serverURL + config.url;
        console.log("Fetching: ", url, config);
        let response = await fetch(url, config);
        return response;
    }

    get refreshToken() {
        if(this.refreshTokenData === null) {
            this.refreshTokenData = this.getCookieValue("refresh");
        }
        return this.refreshTokenData;
    }
    set refreshToken(token) {
        this.refreshTokenData = token;
        let decoded = this.decode(token);
        this.setCookieValue("refresh", token, decoded.payload.exp);
    }

    get accessToken() {
        if(this.accessTokenData === null) {
            this.accessTokenData = this.getCookieValue("access");
        }
        return this.accessTokenData;
    }
    set accessToken(token) {
        this.accessTokenData = token;
        let decoded = this.decode(token);
        this.setCookieValue("access", token, decoded.payload.exp);
    }

    isTokenExpired(token) {
        if(token === null) {
            return true;
        } else {
            let decoded = this.decode(token);
            let expiry = Number(decoded.payload.exp) * 1000;
            return (new Date().getTime() > expiry);
        }
    }
    
    decode(key) {
        let jwtParts = key.split(".");
        return {
            header: JSON.parse(atob(jwtParts[0])),
            payload: JSON.parse(atob(jwtParts[1])),
            signature: jwtParts[2]
        }
    }
    getCookieValue(key) {
        let returnValue = null;
        let searchLength = key.length;
        let cookieArray = String(this.cookie_root.cookie).split(";");
        for(let i = 0; i < cookieArray.length && returnValue === null; i++) {
            let valString = String(cookieArray[i]).trim();
            if(valString.substring(0, searchLength) === key) {
                returnValue = valString.split("=")[1].trim();
            } 
        }
        return returnValue;
    }

    setCookieValue(key, value, expirySeconds) {
        let expiryDate = new Date(expirySeconds * 1000).toGMTString();
        let cookie_value = key + "=" + value + "; expires=" + expiryDate;
        this.cookie_root.cookie = cookie_value;
    }
}
export default ABCIAMClient;