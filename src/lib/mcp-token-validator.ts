import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';

const jwksClient = jwksRsa({
  jwksUri: `https://${process.env.AUTH0_MGMT_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutes
});

function getSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    jwksClient.getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      resolve(key!.getPublicKey());
    });
  });
}

export interface McpTokenPayload {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  scope?: string;
  permissions?: string[];
  [key: string]: unknown;
}

// Tool name → required OAuth scope
export const TOOL_SCOPES: Record<string, string> = {
  list_projects: 'mcp:list_projects',
  get_issue: 'mcp:get_issue',
  comment_on_issue: 'mcp:comment_on_issue',
};

export function tokenHasScope(payload: McpTokenPayload, scope: string): boolean {
  // RBAC-enabled APIs put granted permissions in `permissions`, not `scope`
  const permissions = payload.permissions ?? [];
  if (permissions.includes(scope)) return true;

  // Fallback: check `scope` claim (non-RBAC APIs)
  const scopes = payload.scope?.split(' ') ?? [];
  return scopes.includes(scope);
}

export async function validateMcpToken(authHeader: string | null, audience?: string): Promise<McpTokenPayload> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);
  const decoded = jwt.decode(token, { complete: true });

  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid token format');
  }

  const kid = decoded.header.kid;
  if (!kid) {
    throw new Error('Token missing kid header');
  }

  const signingKey = await getSigningKey(kid);

  const payload = jwt.verify(token, signingKey, {
    algorithms: ['RS256'],
    issuer: `https://${process.env.AUTH0_MGMT_DOMAIN}/`,
    audience: audience ?? process.env.AUTH0_AUDIENCE,
  }) as McpTokenPayload;

  return payload;
}
