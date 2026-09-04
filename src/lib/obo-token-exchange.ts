// src/lib/obo-token-exchange.ts
//
// Generic On-Behalf-Of (OBO) token exchange helper (RFC 8693).
// https://auth0.com/docs/secure/call-apis-on-users-behalf/on-behalf-of-token-exchange
//
// Lets a middle-tier service (e.g. this MCP server) trade an incoming
// user-scoped access token for a new token scoped to a *different* downstream
// audience, while preserving the original user's identity (`sub`) and
// tracking the delegation chain via the `act` claim.
//
// This helper is intentionally generic — audience and scope are caller-supplied
// parameters, not hardcoded — so any tool/route in this app (or a reference
// implementation copied elsewhere) can reuse it for its own downstream API.
// The audience/scope for a given caller should still be fixed server-side by
// that caller, not taken from client input — letting a caller request an
// arbitrary target audience at runtime would let it mint tokens for APIs it
// was never granted access to.

export interface OboLogEntry {
  step: string;
  status: 'info' | 'success' | 'error';
  [key: string]: unknown;
}

export interface OboExchangeResult {
  accessToken: string;
  expiresIn: number;
  claims: Record<string, unknown>;
  log: OboLogEntry[];
}

export class OboExchangeError extends Error {
  log: OboLogEntry[];
  constructor(message: string, log: OboLogEntry[]) {
    super(message);
    this.log = log;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length < 2) return {};
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return {};
  }
}

/**
 * Exchange a subject (incoming) access token for a new token scoped to
 * `audience`, on behalf of the same end user.
 *
 * @param subjectToken - The incoming user-scoped access token this service received.
 * @param audience - The downstream API's resource server identifier.
 * @param scope - Optional space-delimited scopes to request on the new token.
 */
export async function exchangeTokenOnBehalfOf(
  subjectToken: string,
  audience: string,
  scope?: string
): Promise<OboExchangeResult> {
  const log: OboLogEntry[] = [];

  const clientId = process.env.AUTH0_MCP_CLIENT_ID;
  const clientSecret = process.env.AUTH0_MCP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    log.push({ step: 'exchange_request', status: 'error', message: 'AUTH0_MCP_CLIENT_ID / AUTH0_MCP_CLIENT_SECRET not configured' });
    throw new OboExchangeError('OBO token exchange is not configured (missing AUTH0_MCP_CLIENT_ID/AUTH0_MCP_CLIENT_SECRET)', log);
  }

  // Log the exact RFC 8693 request parameters we're about to send (minus the
  // secret and the raw subject_token itself) — same field names as the wire
  // request, so the demo shows the real request shape, not a paraphrase.
  const grantType = 'urn:ietf:params:oauth:grant-type:token-exchange';
  const subjectTokenType = 'urn:ietf:params:oauth:token-type:access_token';
  const requestedTokenType = 'urn:ietf:params:oauth:token-type:access_token';

  log.push({
    step: 'exchange_request',
    status: 'info',
    grant_type: grantType,
    subject_token_type: subjectTokenType,
    requested_token_type: requestedTokenType,
    audience,
    scope: scope ?? null,
  });
  console.log(`🔁 [OBO] Requesting token exchange — audience=${audience} scope=${scope ?? '(none)'}`);

  const params = new URLSearchParams({
    grant_type: grantType,
    client_id: clientId,
    client_secret: clientSecret,
    subject_token: subjectToken,
    subject_token_type: subjectTokenType,
    requested_token_type: requestedTokenType,
    audience,
  });
  if (scope) params.append('scope', scope);

  const tokenUrl = `${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    log.push({
      step: 'exchange_failed',
      status: 'error',
      error: data.error ?? 'unknown_error',
      error_description: data.error_description ?? null,
    });
    console.error('❌ [OBO] Token exchange failed:', data);
    throw new OboExchangeError(data.error_description || data.error || 'OBO token exchange failed', log);
  }

  const claims = decodeJwtPayload(data.access_token);

  // act.sub is the immediate actor that performed this exchange — when the
  // exchanging client is registered as an Agent (Agents as Principal), Auth0
  // stamps that agent's real agent_id here automatically.
  const actingAgentId = (claims.act as { sub?: string } | undefined)?.sub ?? null;

  log.push({
    step: 'exchange_success',
    status: 'success',
    iss: claims.iss ?? null,
    sub: claims.sub ?? null,
    aud: claims.aud ?? null,
    act: claims.act ?? null,
    scope: claims.scope ?? null,
    exp: claims.exp ?? null,
    acting_agent_id: actingAgentId,
    expires_in: data.expires_in,
  });
  console.log(`✅ [OBO] Token issued — aud=${JSON.stringify(claims.aud)} acting_agent_id=${actingAgentId} act=${JSON.stringify(claims.act)}`);

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    claims,
    log,
  };
}

/**
 * Record a downstream call (request + response) into an existing OBO log,
 * so the full chain — exchange, then the actual on-behalf-of call — shows up
 * together in diagnostics.
 */
export function logDownstreamCall(
  log: OboLogEntry[],
  endpoint: string,
  method: string,
  status: number
): void {
  const entry: OboLogEntry = {
    step: 'downstream_call',
    status: status >= 200 && status < 300 ? 'success' : 'error',
    method,
    endpoint,
    http_status: status,
  };
  log.push(entry);
  console.log(`${entry.status === 'success' ? '✅' : '❌'} [OBO] Downstream call — ${method} ${endpoint} → ${status}`);
}
