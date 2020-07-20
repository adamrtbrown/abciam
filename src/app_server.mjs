import express from 'express'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import abciam from './abciam/ABCIAM.js'

dotenv.config({path: './.env'});

let port = process.env.SERVER_PORT;
let app = express();

app.use(function(req, res, next){
  console.log("REQ: " + req.path);
  next();
})
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(express.static('build'))

app.get('/test', function(req, res){
  res.json({test:1});
});
app.post('/login', async function(req, res){
  try {
    console.log("in auth");
    let id_token = req.body.id_token;
    let provider = req.body.provider;
    let app_id = req.body.app_id;
    let app_secret = req.body.app_secret;
    let abc = new ABCIAM(app_id, app_secret);
    console.log("app_id", app_id);
    console.log("getting user");
    let token = await abc.login(id_token, provider, app_id);
    console.log("user",token)
    res.json({"token": token});
  } catch (err) {
    console.log(err);
    res.json({err:1});
  }
});

app.post('/logout', function(req, res){
  console.log("logout");
});

app.post('/refresh', function(req, res){
  console.log("refresh");
});

app.listen(port, () => console.log(`Listening on ${port}`));
