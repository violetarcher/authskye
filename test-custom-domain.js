// Test if Node.js can connect to custom domain
const https = require('https');

console.log('Testing connection to custom domain...\n');

const url = 'https://login.authskye.org/.well-known/openid-configuration';

https.get(url, (res) => {
  console.log('✅ Status:', res.statusCode);
  console.log('✅ Headers:', JSON.stringify(res.headers, null, 2));

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\n✅ Successfully fetched OpenID config');
      console.log('   Issuer:', json.issuer);
      console.log('   Authorization endpoint:', json.authorization_endpoint);
    } catch (e) {
      console.error('❌ Failed to parse JSON:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('❌ Connection failed:', err.message);
  console.error('   Code:', err.code);
  console.error('   Stack:', err.stack);
});
