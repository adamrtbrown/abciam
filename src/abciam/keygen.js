import DB from '../tools/db.js';
import dotenv from 'dotenv';
const environment = dotenv.config({path: '.env'});
const keylen = 4096;

let db = new DB();

let latest = "";
for(var i = 0; i < keylen; i++) {
    latest += String.fromCharCode(Math.floor(Math.random() * 94) + 32);
}

(async function() {
    let res = await db.query("SELECT latest FROM signing_keys LIMIT 1");
    let query = "UPDATE signing_keys SET previous=latest, latest=? WHERE `id`=1";
    if(!res.results.length) {
        query = "INSERT INTO signing_keys(id,latest,previous) VALUES (1,?,'')";
    }
    await db.query(query, latest);
    console.log("Keys Updated"); process.exit(0);
})();
