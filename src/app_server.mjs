import express from 'express'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import abciam from './abciam/abciam.mjs'

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
app.post('/auth', async function(req, res){
  try {
  console.log("in auth");
  let id_token = req.body.id_token;
  let provider = req.body.provider;
  let app_id = req.body.app_id;
  let abc = new abciam();
  console.log("app_id", app_id);
  console.log("getting user");
  let token = await abc.getAuth(id_token, provider, app_id);
  console.log("user",token)
  res.json({"token": token});
  } catch (err) {
    console.log(err);
    res.json({err:1});
  }
});
app.listen(port, () => console.log(`Listening on ${port}`));
