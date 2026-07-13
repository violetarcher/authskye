// Returns public OAuth config needed by the MCP client PKCE flow.
// These values are not secrets (they appear in OAuth URLs anyway).
export function GET() {
  return Response.json({
    auth0Domain: process.env.AUTH0_MGMT_DOMAIN,
    audience: process.env.AUTH0_AUDIENCE,
    baseUrl: process.env.AUTH0_BASE_URL,
  });
}
