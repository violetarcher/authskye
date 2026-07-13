// CIMD (Client ID Metadata Document) served dynamically so it always reflects
// the current AUTH0_BASE_URL (ngrok domain changes between sessions).
export function GET() {
  const baseUrl = process.env.AUTH0_BASE_URL;

  if (!baseUrl) {
    return Response.json({ error: 'AUTH0_BASE_URL not configured' }, { status: 500 });
  }

  const metadata = {
    client_id: `${baseUrl}/api/mcp-client-metadata`,
    client_name: 'Authskye MCP Client',
    description: 'Demo MCP client for Auth for MCP showcase',
    application_type: 'web',
    grant_types: ['authorization_code', 'refresh_token'],
    redirect_uris: [`${baseUrl}/mcp/callback`],
    token_endpoint_auth_method: 'none',
    response_types: ['code'],
  };

  return Response.json(metadata, {
    headers: {
      // Allow Auth0 to fetch this without CORS issues
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}
