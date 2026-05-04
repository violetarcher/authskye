/**
 * Add Organization Metadata to Tokens
 *
 * This action adds organization metadata to ID tokens and access tokens
 * so the application can display organization name, logo, etc.
 *
 * Flow: Login / Post Login
 *
 * Add these secrets to the action:
 * - MANAGEMENT_API_CLIENT_ID - Your M2M application client ID
 * - MANAGEMENT_API_CLIENT_SECRET - Your M2M application client secret
 * - AUTH0_DOMAIN - Your Auth0 domain (e.g., archfaktor.us.auth0.com)
 */

const axios = require('axios');

exports.onExecutePostLogin = async (event, api) => {
  // Only process if user is in an organization
  if (!event.organization) {
    console.log('User not in organization, skipping metadata enrichment');
    return;
  }

  const namespace = 'https://agency-inc-demo.com';
  const orgId = event.organization.id;
  const orgName = event.organization.display_name || event.organization.name;

  console.log('Adding organization metadata for org:', orgId);

  try {
    // Get Management API token
    const tokenResponse = await axios.post(`https://${event.secrets.AUTH0_DOMAIN}/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: event.secrets.MANAGEMENT_API_CLIENT_ID,
      client_secret: event.secrets.MANAGEMENT_API_CLIENT_SECRET,
      audience: `https://${event.secrets.AUTH0_DOMAIN}/api/v2/`
    });

    const accessToken = tokenResponse.data.access_token;

    // Get organization details including metadata
    const orgResponse = await axios.get(
      `https://${event.secrets.AUTH0_DOMAIN}/api/v2/organizations/${orgId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const orgData = orgResponse.data;
    const metadata = orgData.metadata || {};

    console.log('Organization metadata:', metadata);

    // Add organization metadata to tokens
    api.idToken.setCustomClaim(`${namespace}/org_id`, orgId);
    api.idToken.setCustomClaim(`${namespace}/org_name`, orgName);

    api.accessToken.setCustomClaim(`${namespace}/org_id`, orgId);
    api.accessToken.setCustomClaim(`${namespace}/org_name`, orgName);

    // Add logo if exists in metadata
    if (metadata.logo_url) {
      console.log('Adding logo URL to token:', metadata.logo_url);
      api.idToken.setCustomClaim(`${namespace}/org_logo`, metadata.logo_url);
      api.accessToken.setCustomClaim(`${namespace}/org_logo`, metadata.logo_url);
    }

    // Add any other metadata fields you want in the token
    if (metadata.website) {
      api.idToken.setCustomClaim(`${namespace}/org_website`, metadata.website);
      api.accessToken.setCustomClaim(`${namespace}/org_website`, metadata.website);
    }

    console.log('✅ Organization metadata added to tokens');

  } catch (error) {
    console.error('Failed to add organization metadata:', error.message);
    // Don't fail the login if metadata fetch fails
  }
};
