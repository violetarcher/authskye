# CLAUDE.md

## Project Overview

B2B ERP / procurement & operations platform demo using **Auth0 Organizations**, **Auth0 FGA**, and **Next.js 14 App Router**. Features multi-tenancy, CIBA-based PO approval, step-up MFA, Kong API Gateway, AI Agents demo, and Auth for MCP.

**Brand:** ERPCore | **Namespace:** `https://authskye.com` (unchanged) | **Primary Color:** `#0070f2`

## Commands

```bash
npm run dev      # Dev server on port 4020
npm run build    # Production build
npm run lint     # ESLint
```

**Local dev requires:** ngrok tunnel (`ngrok http 4020 --domain your-domain.ngrok-free.app`)

## Core Patterns

### API Route Pattern

```typescript
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { checkPermission, formatUserId, formatDocId } from '@/lib/fga-service';
import { mySchema } from '@/lib/validations';

export const POST = withApiAuthRequired(async function POST(request) {
  const session = await getSession();
  const user = session?.user;
  if (!user?.sub) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Validate input
  const body = await request.json();
  const validation = mySchema.safeParse(body);
  if (!validation.success) return Response.json({ error: 'Validation error' }, { status: 400 });

  // Check FGA permission — use email to get username-based FGA subject
  const canRead = await checkPermission(formatUserId(user.email ?? user.sub), 'can_read', formatDocId(resourceId));
  if (!canRead) return Response.json({ error: 'Permission denied' }, { status: 403 });

  // Business logic...
});
```

### Session Claims

```typescript
user.sub                                    // User ID (required)
user.org_id                                 // Organization ID (optional)
user['https://authskye.com/roles']          // Roles array
user['https://authskye.com/org_name']       // Org display name
user['https://authskye.com/org_logo']       // Org logo URL
```

### FGA Operations

```typescript
import { checkPermission, writeTuple, formatUserId, formatDocId, formatGroupMember } from '@/lib/fga-service';

// Check permission — always pass email so FGA subject is username-based
await checkPermission(formatUserId(user.email ?? user.sub), 'can_read', formatDocId(docId));

// Grant ownership
await writeTuple({ user: formatUserId(user.email ?? user.sub), relation: 'owner', object: formatDocId(docId) });

// Share with group
await writeTuple({ user: formatGroupMember(groupId), relation: 'viewer', object: formatDocId(docId) });
```

**FGA User ID mapping:** `formatUserId` extracts the local part of an email (`violet.archer@okta.com` → `user:violet.archer`), and also strips any `+alias` suffix (`violet.archer+admin@okta.com` → `user:violet.archer`) since FGA tuples can't store `+`. Falls back to raw value if no `@` present. Always prefer `user.email ?? user.sub` as the input — never pass `user.sub` alone.

**FGA Object Types:** `user:{id}`, `group:{id}`, `folder:{id}`, `doc:{id}`, `agent:{id}`, `project:{id}`

## Key Files

| Purpose | File |
|---------|------|
| Zod schemas | `src/lib/validations.ts` |
| FGA operations | `src/lib/fga-service.ts` |
| Auth0 handler | `src/app/api/auth/[...auth0]/route.ts` |
| Session management | `src/lib/auth0-session-manager.ts` |
| Theme colors | `src/app/globals.css` |
| Universal Login | `auth0-templates/universal-login-template.html` |

## Environment Variables

```env
AUTH0_ISSUER_BASE_URL    # Custom domain for login (https://login.authskye.org)
AUTH0_MGMT_DOMAIN        # Canonical domain for API (archfaktor.us.auth0.com)
AUTH0_MCP_AUDIENCE       # Audience for MCP Tools API (http://localhost:3001/)
FGA_STORE_ID / FGA_CLIENT_ID / FGA_CLIENT_SECRET
FIREBASE_SERVICE_ACCOUNT_BASE64
CTE_CLIENT_ID / CTE_CLIENT_SECRET  # Custom Token Exchange for My Account API
```

## Feature Guides

### CIBA (Push Notification Approval)

```typescript
// Initiate
const { auth_req_id } = await fetch('/api/ciba/initiate', {
  method: 'POST',
  body: JSON.stringify({ binding_message: 'Approve: 285.00 USD' }) // alphanumeric + +-_.,:# only
});

// Poll every 5 seconds
const { status } = await fetch('/api/ciba/poll', { method: 'POST', body: JSON.stringify({ auth_req_id }) });
// status: 'approved' | 'pending' | 'denied' | 'expired'
```

**Critical:** `login_hint.iss` must use canonical domain with trailing slash.

### Step-Up MFA

```typescript
window.location.href = '/api/auth/login?stepup=true&returnTo=/sensitive-page';
```

### Custom Domains

- **Custom domain** (`AUTH0_ISSUER_BASE_URL`): Used for authorize calls and My Account API
- **Canonical domain** (`AUTH0_MGMT_DOMAIN`): Used for Management API
- Organization invitations need `auth0-custom-domain` header when multiple custom domains exist

### Kong Gateway

Routes in `src/app/api/kong-protected/*` require `X-Kong-Protected` header (added by Kong).

```typescript
const kongProtected = request.headers.get('X-Kong-Protected');
if (!kongProtected) return Response.json({ error: 'Must go through Kong' }, { status: 401 });
```

### AI Agents Demo

Dual authorization: both user AND agent must have permission. Uses FGA types: `agent:{id}`, `project:{id}`, `issue:{id}`.

### Auth for MCP

MCP server at `/api/mcp` uses CIMD (Client ID Metadata Document) for client registration. The CIMD endpoint is `/api/mcp-client-metadata` — it must declare a `scope` field listing all allowed scopes or Auth0 will issue empty scope on consent.

Token validation uses `AUTH0_MCP_AUDIENCE`. Scopes are checked via `scope` claim only (not RBAC `permissions`). FGA `can_call` gates tool discovery and execution as a second layer.

**Critical:** The MCP Tools API (`http://localhost:3001/`) must have RBAC (`enforce_policies`) **disabled** for scope-based consent to work.

**On-Behalf-Of (OBO) token exchange:** `/mcp` has a dedicated, full-width "4. On-Behalf-Of (OBO) Token Exchange" section, deliberately separate from the generic tool console (Panel 3) and from CIMD/consent scopes entirely. The left side is a small chat window ("Procurement Agent") — type something like *"Submit a PO for Acme Supply Co for $1500"* and a rule-based parser (`parsePurchaseOrderRequest` in `src/app/mcp/page.tsx` — intentionally not an LLM call; the point of this demo is the OBO mechanics, not conversational NLU) extracts vendor/amount and calls the `submit_purchase_order` tool using the *same already-connected MCP token*, which intentionally never carries `transaction:pay` and never requests it via consent. Because that scope is missing, the MCP server performs an RFC 8693 OBO exchange (`src/lib/obo-token-exchange.ts` — `exchangeTokenOnBehalfOf(subjectToken, audience, scope)`) for a new token scoped to `CIBA_AUDIENCE` with `transaction:pay`, then calls the real `/api/billing/submit` with it. The chat gets a plain-language summary; the right side shows the full technical Exchange Log.

**Do not** add an OBO-only tool's required scope to `TOOL_SCOPES` or to the CIMD `scope` field / the `/mcp` page's own `/authorize` request — that would defeat the point. The whole value of OBO is that the original token deliberately lacks the downstream scope; the server bridges the gap on demand, not via upfront user consent.

Requires `AUTH0_MCP_CLIENT_ID` / `AUTH0_MCP_CLIENT_SECRET` — the credentials of a **Custom API Client** (`app_type: resource_server`) tied to the MCP Tools API resource server, associated with a registered **Agent** (Agents as Principal, EA) so Auth0 stamps the real `agent_id` into the exchanged token's `act.sub` claim automatically — no agent picker needed in the UI, the acting agent is intrinsic to which client performed the exchange. Also requires a user-delegated client grant to the downstream audience and the On-Behalf-Of Token Exchange toggle enabled in the Dashboard. Every exchange step (and the downstream call) is logged to a structured `_obo` array; `acting_agent_id` (pulled from `act.sub`) is surfaced prominently above the Exchange Log.

`submit_purchase_order` is also excluded from the generic tool dropdown (Panel 3) and is listed in `FGA_EXEMPT_TOOLS` (`src/app/api/mcp/route.ts`), skipping the FGA `can_call` layer entirely — this tool's authorization is the downstream `transaction:pay` scope check alone, demonstrating the "OBO only" case, while the other three tools demonstrate FGA gating. No FGA tuple is needed. Also note this tool has no CIBA/Guardian push-approval step — OBO issues the downstream token immediately, unlike the interactive CIBA flow the rest of the billing demo uses.

## Do's and Don'ts

**Always:**
- Use Zod schemas from `validations.ts`
- Format FGA IDs with prefixes (`user:`, `doc:`, etc.)
- Wrap routes with `withApiAuthRequired`
- Use canonical domain for `AUTH0_MGMT_DOMAIN`

**Never:**
- Skip FGA permission checks
- Use custom domain for Management API
- Forget `auth0-custom-domain` header for invitations (causes 409)
- Use `connection` param if you want Home Realm Discovery

## Debugging

- **FGA issues:** Check FGA Dashboard for tuples, verify ID formatting
- **Session issues:** Check `revoked-sessions.json`, browser console for SessionValidator logs
- **Kong issues:** Disable VPN, check `X-Kong-Protected` header

## Rebranding

See `REBRANDING.md` for complete checklist and the **Authskye baseline** (default brand). Key areas:
1. JWT namespace in Auth0 Actions + all claim-reading code
2. `src/app/layout.tsx` metadata
3. `src/app/icon.tsx` favicon
4. `src/app/globals.css` colors
5. `src/app/page.tsx` — WelcomePage and Dashboard content
6. `src/components/sidebar.tsx` and `sidebar-nav.tsx`
7. Organization signup page and form
8. Billing page labels and demo data
