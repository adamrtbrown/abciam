import uuid from 'uuid';
import DB from '../tools/db.mjs'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import jwkToPem from 'jwk-to-pem'
class ABCIAM {
    constructor(app_id, app_secret) {
        this.app_id = validateAppId(app_id, app_secret);
        this.database_driver = null;
    }
    async login(id_token, provider, app_id) {
        let return_default = {'token': false};
        try{
            console.log("ID TOKEN:\n",jwt.decode(id_token, {complete:true}));
            await this.verifyIDToken(id_token, provider);
            await this.verifyAppId(app_id);
            let user = this.getUser();
            let token = this.getToken(user);
            return token;
        }
        catch(err) {
            return err;
        }
    }
    async verifyIDToken(id_token, provider) {
        return new Promise(async (resolve)=> {
            let uvt = "";
            let verified = false
            let decoded_token = jwt.decode(id_token, {complete:true});
            let key = await this.retrieveKey(provider, decoded_token.header.kid);
            key = jwkToPem(key);
            
            if(jwt.verify(id_token, key ,{algorithms:[decoded_token.header.alg]})) {
                verified = true;
            }
            if (provider === 'google') {
                this.user_id = decoded_token.payload.sub;
            }
            if(!verified) {
                throw new Error("Invalid token");
            }
            resolve(verified);
        });
    }
    
    async retrieveKey(provider, kid) {
        return new Promise(async (resolve) => {
            let query = "SELECT `kid`,`key` FROM `sign_creds` WHERE `provider` = ?";
            let result = await this.db.query(query, [provider]); 
            if (result.error) {
                throw error;
            }
        
            let key_ob = {};
            result.results.forEach(function(row){
                let key_ob = {};
                key_ob[row.kid] = row.key;
            });
        
            if (!key_ob[kid]) {
                if (provider === 'google') {
                    let http_resp = await axios.get(this.google_config);
                    let config = http_resp.data;
                    http_resp = await axios.get(config.jwks_uri);
                    let keys = http_resp.data.keys;
                    let insert_array = [];
                    if (keys) {
                        query = "DELETE FROM `sign_creds` WHERE `provider` = ?";
                        let res = await this.db.query(query, [provider]);
                        
                        keys.forEach(function(value){
                        insert_array.push([provider,value.kid,JSON.stringify(value)]);
                        key_ob[value.kid] = value;
                        });
                        query = "INSERT INTO `sign_creds`(`provider`,`kid`,`key`) VALUES ?";
                        res = await this.db.query(query, [insert_array]);
                    }
                }
            } 
            if(!key_ob[kid]) {
                throw new Error("No key found for kid", kid, provider);
            }
            resolve(key_ob[kid]);
        });
    }
    async getUser() {
        if(!this.user_id || !this.app_id) {
            throw new Error("Getting user before verifying token or app.");
        }
        let user = await this.retrieveUser(this.user_id, this.app_id);
        if (user === false) {
            user = await this.createUser(this.user_id, this.app_id);
        }
        return user;
    }
    
      async retrieveUser(user_id, app_id) {
        let user = false;
        let query = "SELECT uid FROM `users` WHERE `app_id` = ? AND `user_id` = ? LIMIT 1";
        let result = await this.db.query(query, [app_id, user_id]);
        let record = result.results;
        console.log(result);
        if(record.length !== 0) {
            user = record[0];
        }
        return user;
    }
    
    async createUser(user_id, app_id) {
        let unique_id = uuid.v4();
        let query = "INSERT INTO users(uid, app_id, user_id) VALUES (?,?,?)";
        let result = await this.db.query(query, [unique_id, app_id, user_id]);
        if(result.error) {
            throw result.error;
        }
        return {"uuid": unique_id}
    }
    certToPEM(cert) {
        let parts = cert.split("-----");
        let header = "-----" + parts[1] + "-----\n";
        let footer = "\n-----" + parts[3] + "-----\n";
        let body = parts[2].replace(/\s/g,"").match(/.{1,64}/g).join('\n');
        cert = header + body + footer;
        return cert;
    }
    get db(){
        if(this.database_driver === null) {
            this.database_driver = new DB();
        } 
        return this.database_driver;
    }
    set db(driver) {
        this.database_driver = driver;
    }
    //request handler
    //validate login id_token
    //create user
    //generate refresh token
    //validate refresh token
    //invalidate refresh token
    //invalidate all
}

class ABCIAMAppServer {
    constructor() {
        this.refreshToken = null;
        this.accessToken = null;
        this.ABCIAM_URL = "";
        this.app_id_data = null;
    }

    async login(id_token, provider) {
        if(this.app_id === null) {
            throw new Error("ABCIAM App ID not set");
        }
        let url = this.ABCIAM_URL + "/login";
        let response = await axios.post(url, {'id_token': id_token, 'provider': provider, 'app_id':app_id, 'app_secret':app_secret});
        return response.data.token;
    }

    set app_id(app_id) {
        this.app_id_data = app_id;
    }
    get app_id() {
        return this.app_id_data;
    }
    //login // passthrough to ciam
    //logout //passthrough to ciam
    //refresh // refreshes token from CIAM
}

import axios from 'axios';
class ABCIAMAppClient {
    constructor() {
        this.accessTokenData = null;
        this.refreshTokenData = null;
        //this.cookie_root = cookie_root ?? window.document;
        this.cookie_root = window.document;
        this.serverURL = "";
        this.loginRoute = "/login";
        this.logoutRoute = "/logout";
        this.refreshRoute = "/refresh";
    }
    async login(id_token, provider){
        let url = this.serverURL + this.loginRoute;
        let response = await axios.post(url,{'id_token' : id_token, 'provider' : provider});
        if(response.data) {
            this.refreshToken = response.data.refreshToken;
            this.accessToken = response.data.accessToken;
        }
    }
    async logout(all) {
        let url = this.serverURL + this.logoutRoute;
        let response = await axios.post(url, {'token': this.refreshToken, 'all': all});
        this.setCookieValue("refresh", "", 0);
        this.setCookieValue("access", "", 0);

    }
    async refresh() {
        let url = this.serverURL + this.refreshRoute;
        let response = await axios.post(url, {'token': this.refreshToken});
        if(this.refreshToken !== null) {
            this.refreshToken = response.data.token
        }
        // or need to log in
        
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

    checkExpired(token) {
        let decoded = this.decode(token);
        let expiry = Number(decoded.payload.exp) * 1000;
        return (new Date().getTime() > expiry);
    }
    
    decode(key) {
        let jwtParts = this.refresh.split(".");
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
        for(let i = 0; i < cookieArray.length && returnValue === null; i++)  {
            if(cookieArray[i].substring(0, searchLength) === key) {
                returnValue = cookieArray[i].split("=").trim();
            } 
        }
        return returnValue;
    }

    setCookieValue(key, value, expirySeconds) {
        let expiryDate = new Date(expirySeconds * 1000).toGMTString()
        this.cookie_root = key + "=" + value + "; expires=" + expiryDate;
    }
}
export default {
    ABCIAM,
    ABCIAMAppServer,
    ABCIAMAppClient
}

    /*
    1. login
        1. client sends id token to server
        2. Server sends id token to CIAM
        3. CIAM validates token
        4. CIAM creates refresh token
        5. CIAM sends refresh token to server
        6. Server creates access token
        7. Server sends access and refresh token to client. 
    2. logout
        1. Client sends refresh to server
        2. Server sends refresh to CIAM
        3. CIAM invalidates user w/ time.
        4. Server sends client "true" 
        5. client deletes access and refresh tokens

    3. request / refresh
        1. Client sends request
            a. client validates access token as invalid
            b. Server responds with unauthorized
        2. Client sends refresh to server
        3. Server sends refresh to CIAM
        4. Server validates CIAM
            a. Invalid: 
                1. CIAM server sends logout to server with uid.
                2. Server sends logout to client.
            b. Valid
                1. Login 5-7

    CIAM
        validate login id_token
        create user
        generate refresh token
        validate refresh token
        invalidate refresh token
        invalidate all

    SERVER
        login
        logout
        access
        refresh
        generate access token
    CLIENT
        login 
        logout
        request
        refresh
    */
