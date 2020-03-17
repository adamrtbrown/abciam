import http from 'http';
import url from 'url';
//import UserService from './lib/UserService'
import fs from 'fs';

function getResource(path) {
    let path_parts = path.split("/");
    let version = path_parts[0];
    let resource_name = [];
    for(let i = 1; i < path_parts.length; i += 2) {
        resource_name.push(path_parts[i]);
    }
    return resource_name.join(" ");
}
fs.readFile('forms.html', function (err, formHTML) {
    http.createServer(function (req, res) {
        // req.method;
        // req.url;
        let context = {};
        let query = url.parse(req.url, true).query;
        let path = url.parse(req.url, true).pathname;

        let full_request_path = [req.method, getResource(path)].join(" ").trim();
        let body = '';
        //console.log(full_request_path);
        req.on('data', chunk => {
            body += chunk.toString(); // convert Buffer to string
        });
        req.on('end', async () => {
            body = (body === '') ? {} : JSON.parse(body);
            let event = body;
            event.path = path;
            event.headers = req.headers;
            let response = {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": "{\"error_message\": \"Not found.\"}"
            }
            console.log("jj");
            switch (full_request_path) {
                case "GET":
                    response = {
                        "statusCode": 200,
                        "headers": {"Content-Type": "text/html"},
                        "body": formHTML
                    }
                    break;
                case "POST user" :
                    response = UserService.createUser(event, context);
                    break;
                case "PUT user" :
                    response = UserService.updateUser(event, context);
                    break;
                case "POST app" :
                    response = await UserService.createApp(event, context);
                    break;
                case "PUT app" :
                    console.log("api: PUT app");
                    response = UserService.updateApp(event, context);
                    break;
                default : 
                    break;
            }
            console.log(response);
            res.writeHead(response.statusCode, response.headers);
            res.end(response.headers["Content-Type"] === "text/html" ? response.body : JSON.stringify(response.body));
        });
    }).listen(8082);
    console.log("Listening on 8082");
});