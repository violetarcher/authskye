// Test Auth0 SDK connection to custom domain
const { Issuer } = require('openid-client');

console.log('Testing Auth0 SDK discovery with custom domain...\n');

const issuerUrl = 'https://login.authskye.org';

Issuer.discover(issuerUrl)
  .then((issuer) => {
    console.log('✅ Successfully discovered issuer');
    console.log('   Issuer:', issuer.issuer);
    console.log('   Authorization endpoint:', issuer.authorization_endpoint);
    console.log('   Token endpoint:', issuer.token_endpoint);
  })
  .catch((err) => {
    console.error('❌ Discovery failed:', err.message);
    console.error('   Code:', err.code);
    if (err.code === 'ECONNRESET') {
      console.error('\n⚠️  ECONNRESET means the connection was reset.');
      console.error('   This could be:');
      console.error('   - Network/firewall blocking the connection');
      console.error('   - SSL/TLS handshake issue');
      console.error('   - Connection pool exhaustion');
    }
  });
