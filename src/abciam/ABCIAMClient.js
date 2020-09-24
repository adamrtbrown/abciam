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
        let loggedIn = this.refreshToken || !this.isTokenExpired(this.refreshToken);
        if(!loggedIn) {
            this.logout();
        }
        return loggedIn;
    }

    get provider() {
        if(!this.refreshToken) {
            return null;
        }
        let decoded = this.decode(this.refreshToken);
        return decoded.payload.provider;
    }
    
    async login(id_token, provider) {
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
        if(this.refreshToken === null) {
            this.accessToken = null;
            console.log("ABCIAM: Already logged out");
            return;
        } 
        
        let url = this.serverURL + this.resource;
        let config = {
            method: "delete",
            headers: {
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify({'token': this.refreshToken, 'all': all}),
        }
        this.refreshToken = null;
        this.accessToken = null;

        let response = await fetch(url, config);
        console.log("ABCIAM: logged out");

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

    get refreshToken() {
        if(this.refreshTokenData === null) {
            this.refreshTokenData = this.getCookieValue("refresh");
        }
        return this.refreshTokenData;
    }
    set refreshToken(token) {
        let expiry = 0;
        if(token !== null) {
            let decoded = this.decode(token);
            expiry = decoded.payload.exp;
        }
        this.refreshTokenData = token;
        this.setCookieValue("refresh", token, expiry);
    }

    get accessToken() {
        if(this.accessTokenData === null) {
            this.accessTokenData = this.getCookieValue("access");
        }
        if(this.isTokenExpired(this.accessTokenData)){
            this.refresh();
        }
        return this.accessTokenData;
    }
    set accessToken(token) {
        let expiry = 0;
        if(token !== null) {
            let decoded = this.decode(token);
            expiry = decoded.payload.exp;
        }

        this.accessTokenData = token;
        this.setCookieValue("access", token, expiry);
    }

    isTokenExpired(token, relative = 0) {
        if(token === null) {
            return true;
        } else {
            let decoded = this.decode(token);
            let expiry = Number(decoded.payload.exp) * 1000;
            let now = new Date().getTime() + (relative * 1000);
            let isExpired = (now > expiry);
            console.log("Expired:", expiry, now, (expiry - now), isExpired);
            
            return (isExpired);
        }
    }
    
    decode(key) {
        key = String(key).trim();
        if(!key) {
            return null;
        }
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