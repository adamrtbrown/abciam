
import uuid from 'uuid';
import DB from '../tools/db.mjs'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import jwkToPem from 'jwk-to-pem'
class ABCIAM {

  constructor() {
    this.verified = false;
    this.db = new DB();
    this.app_id = false;
    this.app_secret = false;
    this.user_id = false;
    this.google_config = "https://accounts.google.com/.well-known/openid-configuration";
  }
  
  async getAuth(id_token, provider, app_id) {
    //var res = await this.testFunction();
    try{
      console.log("ID TOKEN:\n",jwt.decode(id_token, {complete:true}));
      await this.verifyToken(id_token, provider);
      await this.verifyAppId(app_id);
      this.getUser();
    }
    catch(err) {
      return err;
    }
    return true;
  }

  async verifyToken(id_token, provider) {
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
  
  async verifyAppId(app_id){
    let verified = false;
    let query = "SELECT `app_secret` FROM `apps` WHERE `app_id` = ? LIMIT 1";
    let result = await this.db.query(query, [app_id]);
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
    let query = "SELECT uuid FROM `users` WHERE `app_id` = ? AND `user_id` = ? LIMIT 1";
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
  
  async testFunction() {
    return new Promise(async (resolve) => {
    let query = "SELECT kid, public, private FROM signing_keys LIMIT 1";
    let result = await this.db.query(query);
    if(result.error) {
      throw result.error;
    }
    //console.log(result);
    let test_data = {
      user_id: 12345,
      test_data: "parents"
    }
    let res = result.results[0];
    res.public = this.certToPEM(res.public);
    res.private = this.certToPEM(res.private);
    console.log(res.public);
    console.log(res.private);

    let use_jwt = jwt.sign(test_data, res.private, {algorithm:'RS256'});
    console.log("signed");
    let verified = jwt.verify(use_jwt,res.public,{algorithms:['RS256']});
    console.log("verified")
    let verified_bad = jwt.verify(use_jwt,'janky',{algorithms:['RS256']});
    console.log(verified, verified_bad);
    resolve(true);
    });
  }

  certToPEM(cert) {
    let parts = cert.split("-----");
    let header = "-----" + parts[1] + "-----\n";
    let footer = "\n-----" + parts[3] + "-----\n";
    let body = parts[2].replace(/\s/g,"").match(/.{1,64}/g).join('\n');
    cert = header + body + footer;
    return cert;
  }
  
}
export default ABCIAM