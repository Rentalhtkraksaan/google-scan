const https = require('https');

const key = 'sk_tc2p1fnrhikcc5bkf2abraykpzeqewsmgmymkzbgbbv01s6k8qmhtpep1ylhcity';
const awb = 'JD0593606501';

// BinderHub / BinderByte API endpoint
// Check both api.binderbyte.com and api.binderhub.id endpoints
const endpoints = [
  `https://api.binderbyte.com/v1/track?api_key=${key}&courier=jnt&awb=${awb}`,
  `https://api.binderhub.id/v1/track?api_key=${key}&courier=jnt&awb=${awb}`,
  `https://api.binderbyte.com/v1/track?api_key=${key}&courier=jet&awb=${awb}`,
];

endpoints.forEach((url, i) => {
  https.get(url, (res) => {
    let body = '';
    res.on('data', (c) => body += c);
    res.on('end', () => {
      console.log(`\n=== Endpoint ${i + 1} (${res.statusCode}) ===`);
      console.log(body);
    });
  }).on('error', (err) => console.error(`Error on ${url}:`, err.message));
});
