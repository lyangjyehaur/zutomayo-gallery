const http = require('http');
http.get('http://localhost:5173', (res) => {
  console.log(`STATUS: ${res.statusCode}`);
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
