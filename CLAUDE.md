# CLAUDE.md

## Project Overview

B2B SaaS demo app using **Auth0 Organizations**, **Auth0 FGA**, and **Next.js 14 App Router**. Features multi-tenancy, CIBA, step-up MFA, Kong API Gateway, and AI Agents demo.

**Brand:** Authskye | **Namespace:** `https://authskye.com` | **Primary Color:** `#3b82f6`

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

  // Check FGA permission
  const canRead = await checkPermission(formatUserId(user.sub), 'can_read', formatDocId(resourceId));
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

// Check permission
await checkPermission(formatUserId(userId), 'can_read', formatDocId(docId));

// Grant ownership
await writeTuple({ user: formatUserId(userId), relation: 'owner', object: formatDocId(docId) });

// Share with group
await writeTuple({ user: formatGroupMember(groupId), relation: 'viewer', object: formatDocId(docId) });
```

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

See `REBRANDING.md` for complete checklist. Key areas:
1. JWT namespace in Auth0 Actions + all claim-reading code
2. `src/app/layout.tsx` metadata
3. `src/app/icon.tsx` favicon
4. `src/app/globals.css` colors
5. `auth0-templates/universal-login-template.html`
6. Organization signup page and form
