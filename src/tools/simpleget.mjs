import http from 'https'
class SimpleGet {
 // 

  async get(url, params) {
    return new Promise((resolve,reject) => {
      let params_array = [];
      for(var i in params) {
        let portion = [encodeURIComponent(String(i).trim()),"=",encodeURIComponent(String(params[i]).trim())];
        params_array.push(portion.join(""));
      }
      let params_string = params_array.join("&");
      if (params_string !== "") {
        url = url + "?" + params_string;
      }
      http.get(url, (res) => {
      const { statusCode } = res;
      const contentType = res.headers['content-type'];
      let error;
      if (statusCode !== 200) {
        error = new Error('Request Failed.\n' +
                          `Status Code: ${statusCode}`);
      } else if (!/^application\/json/.test(contentType)) {
        error = new Error('Invalid content-type.\n' +
                          `Expected application/json but received ${contentType}`);
      }
      if (error) {
        console.error(error.message);
        res.resume();
        return;
      }

      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          resolve(parsedData);
        } catch (e) {
          console.error(e.message);
        }
      });
      }).on('error', (e) => {
        console.error(`Got error: ${e.message}`);
      });
    });

  }
}