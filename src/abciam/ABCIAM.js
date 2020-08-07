import uuid from 'uuidv4';
import DB from '../tools/db.js'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import jwkToPem from 'jwk-to-pem'

class ABCIAM {
    constructor(app_id, app_secret) {
        this.app_id = this.validateAppId(app_id, app_secret);
        this.google_config_url = "https://accounts.google.com/.well-known/openid-configuration";
    }

    async login(id_token, provider, app_id) {
        let return_default = {'token': false};
        if(!id_token || !provider) {
            throw new Error("No token or provider");
        }
        try{
            await this.verifyIDToken(id_token, provider);
            let user = await this.getUser();
            let token = await this.getToken(user, provider);
            return token;
        }
        catch(err) {
            return err;
        }
    }
    async validateAppId(app_id, app_secret){
        let verified = false;
        this.db = new DB();
        let query = "SELECT `app_secret` FROM `apps` WHERE `app_id` = ? AND `app_secret` = ? LIMIT 1";
        console.log("DB:" , this.db);

        let result = await this.db.query(query, [app_id,app_secret]);
        let record = result.results;
        if(record.length !== 0) {
          this.app_id = app_id;
          this.app_secret = record[0].app_secret;
          verified = true;
        }
        if(!verified) {
          throw new Error("Invalid App ID");
        }
        return verified;
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
                    let http_resp = await axios(this.google_config_url);
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
        if (!this.user_id || !this.app_id) {
            throw new Error("Getting user before verifying token or app.");
        }
        let user = await this.retrieveUser(this.user_id, this.app_id);
        if (user === false) {
            user = await this.createUser(this.user_id, this.app_id);
        }
        console.log("GOT USER", user);
        return user;
    }
    
    async retrieveUser(user_id, app_id) {
        let user = false;
        let query = "SELECT uid, id FROM `users` WHERE `app_id` = ? AND `provider_id` = ? LIMIT 1";
        let result = await this.db.query(query, [app_id, user_id]);
        let record = result.results;
        
        if(record.length !== 0) {

            user = { 
                uid: record[0].uid,
                id: record[0].id,
            };
        }
        return user;
    }
    
    async createUser(user_id, app_id) {
        let unique_id = uuid.uuid();
        let query = "INSERT INTO users(uid, app_id, provider_id) VALUES (?,?,?)";
        let result = await this.db.query(query, [unique_id, app_id, user_id]);
        if(result.error) {
            throw result.error;
        }
        
        return {"uid": unique_id, "id": result.insertId}
    }
    async getToken(user, provider) {
        let expiry = Math.round(new Date().getTime() / 1000) + 864000;
        let claims = {
            'user': user.uid,
            'provider': provider,
            'exp': expiry,
            'iat': Math.round(new Date().getTime() / 1000),
            'sub' : "refresh"
        }
        let result = await this.db.query('SELECT `latest` FROM `signing_keys` LIMIT 1');
        let key = result.results[0].latest;
        let token = jwt.sign(claims, key, {algorithm: 'HS256'});
        let sig = token.split(".")[2];
        result = await this.db.query("INSERT INTO `tokens`(`user_id`,`sig`) VALUES (?,?)",[user.id, sig]);
        return token;
    }

    async deleteToken(token, all) {
        let decoded = await this.verifyToken(token);
        if(decoded !== false) {
            if(all === true) {
                let result = await this.db.query("SELECT `id` FROM `users` WHERE `uid`=? LIMIT 1", decoded.user);
                if(result.results[0]) {
                    let delete_result = await this.db.query("DELETE FROM `tokens` WHERE `user_id` = ?", result.results[0].id);
                }
            } else {
                let sig = token.split(".");
                if(sig[2]) {
                    let result = await this.db.query("DELETE FROM `tokens` WHERE `sig` = ? LIMIT 1", sig[2]);
                }
            }
        }
        
    }

    async verifyToken(token) {
        let result = await this.db.query('SELECT `latest`,`previous` FROM `signing_keys` LIMIT 1');
        try {
            return jwt.verify(token, result.results[0].latest, {algorithms: ['HS256']});
        } catch(err) {
            try {
                return jwt.verify(token, result.results[0].precious, {algorithms: ['HS256']});
            } catch(err) {
                return false;
            }
        }
        return false;
    }
    certToPEM(cert) {
        let parts = cert.split("-----");
        let header = "-----" + parts[1] + "-----\n";
        let footer = "\n-----" + parts[3] + "-----\n";
        let body = parts[2].replace(/\s/g,"").match(/.{1,64}/g).join('\n');
        cert = header + body + footer;
        return cert;
    }
    get db() {
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
    constructor(config) {
        this.refreshToken = null;
        this.accessToken = null;
        this.ABCIAM_URL = (config.url) ? config.url : "";
        this.app_id_data = (config.app_id) ? config.app_id : null;
        this.app_secret_data = (config.app_secret) ? config.app_secret : null;
        this.db = new DB();
        console.log("Created ABCIAMAppServer from ", config);
    }

    async login(id_token, provider) {
        if(this.app_id === null) {
            throw new Error("ABCIAM App ID not set");
        }
        if(!id_token || !provider) {
            throw new Error("No token or provider");
        }
        try {
            console.log("Getting token...");
            let config = {
                url: "token",
                baseURL: this.ABCIAM_URL,
                method: "get",
                params: {
                    'id_token': id_token,
                    'provider': provider,
                    'app_id': this.app_id,
                    'app_secret': this.app_secret
                }
            }
            console.log(config);
            let response = await axios(config);
            await this.provisionUser(response.data.token);
            return response.data.token;
        } catch (err) {
            console.log(err);
            throw new Error("ABCIAMAppServer login error:", err);
        }
    }

    async logout(refreshToken, all) {
        let url = this.ABCIAM_URL + "token";
        let data = {
            'token': refreshToken,
            'all': all,
            'app_id': this.app_id,
            'app_secret': this.app_secret
        }
        let response = await axios.delete(url, {data:data});
    }

    async refresh() {
        let url = this.ABCIAM_URL + "token";
        let response = await axios.post(url, {data: {token: this.refreshToken}});
    }

    async provisionUser(token) {
        let details = jwt.decode(token);
        let query = "REPLACE INTO `users`(`uid`) VALUES (?)";
        let response = await this.db.query(query, [details.user]);
    }

    set app_id(app_id) {
        this.app_id_data = app_id;
    }
    get app_id() {
        return this.app_id_data;
    }
    set app_secret(app_secret) {
        this.app_secret_data = app_id;
    }
    get app_secret() {
        return this.app_secret_data;
    }
    //login // passthrough to ciam
    //logout //passthrough to ciam
    //refresh // refreshes token from CIAM
}

export {
    ABCIAM,
    ABCIAMAppServer
};

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
