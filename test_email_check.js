const http = require('http');

const data = JSON.stringify({
    email: 'test_node_check@example.com'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/check-email',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    console.log(`Status: ${res.statusCode}`);

    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('Response:', body);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
