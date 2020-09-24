import express from 'express'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import {ABCIAM} from './abciam/ABCIAM.js'

dotenv.config({path: './.env'});

let port = process.env.SERVER_PORT;
let app = express();

app.use(function(req, res, next){
  console.log("REQ: " + req.path);
  next();
})
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.json());
app.use(express.static('build'))
app.use(function(req, resp, next){
  console.log("Request: ", req.method, req.originalUrl, req.body);
  next();
})

app.get('/test', function(req, res){
  res.json({test:1});
});
app.get('/token', async function(req, res){
  try {
    console.log("in auth");
    let id_token = req.query.id_token;
    let provider = req.query.provider;
    let app_id = req.query.app_id;
    let app_secret = req.query.app_secret;
    let abc = new ABCIAM(app_id, app_secret);
    console.log("app_id", app_id);
    console.log("getting user");
    let token = await abc.login(id_token, provider);
    console.log("user",token)
    res.json({"token": token});
  } catch (err) {
    console.log(err);
    res.json({err:1});
  }
});

app.delete('/token', function(req, res){
  let app_id = req.body.app_id;
  let app_secret = req.body.app_secret;
  let abc = new ABCIAM(app_id, app_secret);
  abc.deleteToken(req.body.token, req.body.all);
  console.log("logout");
  res.end();
});

app.post('/token', function(req, res){
  console.log("refresh", req.body.token);
  res.end();
});

app.listen(port, () => console.log(`Listening on ${port}`));
