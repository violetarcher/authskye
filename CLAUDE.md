# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a B2B SaaS application demonstrating enterprise-grade identity and authorization patterns using Auth0 Organizations, Auth0 FGA (Fine-Grained Authorization), and Next.js 14 App Router. The application showcases multi-tenant architecture, session management, step-up MFA, CIBA (Client-Initiated Backchannel Authentication), and document management with relationship-based access control.

**Key Features:**
- **Healthcare Claims Processing** with CIBA push notification approval
- **Multi-tenant Organizations** with fine-grained access control
- **Session Management** with real-time enforcement
- **Step-Up MFA** for sensitive operations
- **Kong API Gateway** integration with JWT validation
- **AI Agents Demo** with "Agents as Principals" FGA pattern

**Branding:**
- Primary color: Dark navy blue (#0a1d73)
- Configured in `src/app/globals.css` as HSL values: `230 84% 25%`
- Custom Universal Login template with split background design
- Healthcare-focused UI with SecureHealth Portal branding

## Development Commands

```bash
# Development
npm run dev     # Start dev server on port 4020

# Production
npm run build   # Build for production
npm run start   # Start production server

# Code Quality
npm run lint    # Run ESLint
```

## Local Development Requirements

**Required for full functionality:**
- ngrok tunnel: `ngrok http 4020 --domain your-static-domain.ngrok-free.app`
  - Auth0 organization invitations require HTTPS callbacks
  - Use a static domain to avoid reconfiguring Auth0 on every restart
- All environment variables in `.env.local` (see README.md for complete list)
- Auth0 Actions deployed (3 required - see README.md)

## Core Architecture Patterns

### 1. Authentication & Authorization Flow

**The application uses Pure FGA Authorization** - FGA is the single source of truth for all permission checks. No additional Firestore filters by `organizationId` are applied.

**Supports Both Organization and Non-Organization Users:**
- Organization users: Belong to an Auth0 Organization, have `user.org_id` in session
- Non-organization users: Personal workspace, `user.org_id` is undefined
- Both user types use identical FGA authorization patterns

All API routes follow this authorization pattern:

```typescript
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { checkPermission, formatUserId, formatDocId } from '@/lib/fga-service';

export const GET = withApiAuthRequired(async function GET(request) {
  // Layer 1: Authentication (handled by withApiAuthRequired)
  const session = await getSession();
  const user = session?.user;

  // Layer 2: User identity validation (org_id is OPTIONAL)
  if (!user?.sub) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Layer 3: Resource-level authorization (FGA) - SINGLE SOURCE OF TRUTH
  const canRead = await checkPermission(
    formatUserId(user.sub),
    'can_read',
    formatDocId(resourceId)
  );
  if (!canRead) {
    return Response.json({ error: 'Permission denied' }, { status: 403 });
  }

  // Layer 4: Fetch from Firestore (NO organizationId filtering)
  // FGA already authorized access - just fetch the data
  const doc = await db.collection('documents').doc(resourceId).get();

  // Execute business logic
});
```

**Session Context Available:**
- `user.sub` - User ID (e.g., "auth0|123456") - **REQUIRED**
- `user.org_id` - Organization ID - **OPTIONAL** (undefined for non-org users)
- `user['https://agency-inc-demo.com/roles']` - Array of roles (org users only)
- `user['https://agency-inc-demo.com/session_id']` - Current session ID

**Key Principle:**
The `organizationId` field in Firestore is **metadata only** - used for reporting and analytics, NOT for authorization. FGA tuples determine who can access what resources.

### 2. Input Validation Pattern

**All API routes use Zod schemas from `src/lib/validations.ts`:**

```typescript
import { createDocumentSchema } from '@/lib/validations';

const body = await request.json();
const validation = createDocumentSchema.safeParse(body);

if (!validation.success) {
  return Response.json(
    { error: 'Validation error', details: validation.error.errors },
    { status: 400 }
  );
}

const { name, content, parentId } = validation.data; // Typed data
```

When adding new endpoints, always create/reuse schemas in `validations.ts`.

### 3. Auth0 FGA (Fine-Grained Authorization) Integration

**FGA Service Layer:** `src/lib/fga-service.ts`

**Object Model:**
```
user:{auth0_id}       - Users
group:{id}            - Groups
folder:{id}           - Folders
doc:{id}              - Documents

Relations:
- owner               - Full control
- viewer              - Read-only access
- member (groups)     - Group membership
- parent              - Folder containment
- can_read, can_write, can_share - Derived permissions
```

**Key Operations:**

```typescript
import {
  checkPermission,
  writeTuple,
  deleteTuple,
  formatUserId,
  formatDocId,
  formatFolderId,
  formatGroupMember
} from '@/lib/fga-service';

// Check permission
const canRead = await checkPermission(
  formatUserId(userId),
  'can_read',
  formatDocId(docId)
);

// Grant ownership
await writeTuple({
  user: formatUserId(userId),
  relation: 'owner',
  object: formatDocId(docId)
});

// Share with group
await writeTuple({
  user: formatGroupMember(groupId),  // "group:{id}#member"
  relation: 'viewer',
  object: formatFolderId(folderId)
});
```

**Always format IDs before calling FGA operations.**

### 4. Session Management

**Architecture:**

```
SessionValidator (client)    SessionEnforcer (client)
     ↓ polls every 5s             ↓ runs on mount
/api/auth/session/validate   /api/auth/session/enforce-my-limit
     ↓                             ↓
revoked-sessions.json        Auth0 Management API
```

**Key Components:**
- `src/lib/session-revocation.ts` - File-based revocation tracking
- `src/lib/auth0-session-manager.ts` - Auth0 session operations
- `src/components/session-validator.tsx` - Real-time monitoring
- `src/components/session-enforcer.tsx` - Single session enforcement

**Session Revocation:**
Sessions are tracked in `revoked-sessions.json` at project root. This file persists across restarts and ensures immediate revocation without waiting for token expiry.

### 5. Organization Multi-Tenancy

**All data operations MUST filter by organization:**

```typescript
// Firestore queries
const documents = await db.collection('documents')
  .where('organizationId', '==', user.org_id)
  .get();

// Creating resources
await db.collection('documents').add({
  name,
  content,
  organizationId: user.org_id,  // REQUIRED
  ownerId: user.sub,
  createdAt: new Date().toISOString()
});
```

**Organization Context:**
- User's org_id comes from session: `user.org_id`
- Organization metadata (name, logo) in custom claims: `user['https://agency-inc-demo.com/org_name']`

### 6. Custom Domains & Multiple Custom Domains

This application uses **Auth0 Custom Domains** to provide a branded authentication experience. The custom domain is configured to replace the canonical Auth0 domain in user-facing flows while maintaining the canonical domain for API operations.

**Current Configuration:**
- **Custom Domain**: `login.authskye.org` (used for Universal Login)
- **Canonical Domain**: `archfaktor.us.auth0.com` (used for Management API)
- **JWT Issuer**: Tokens are issued with `iss: "https://login.authskye.org/"`

**Environment Variables:**
```env
AUTH0_ISSUER_BASE_URL='https://login.authskye.org'     # Custom domain for authorize calls
AUTH0_MGMT_DOMAIN='archfaktor.us.auth0.com'            # Canonical domain for Management API
```

**Multiple Custom Domains Support:**

When Auth0 has multiple custom domains configured, organization invitations require the `auth0-custom-domain` HTTP header to specify which domain to use in invitation emails.

**Implementation Pattern:**
```typescript
import { ManagementClient } from 'auth0';

// Create Management Client with custom domain header
const customDomainClient = new ManagementClient({
  domain: process.env.AUTH0_MGMT_DOMAIN!,
  clientId: process.env.AUTH0_MGMT_CLIENT_ID!,
  clientSecret: process.env.AUTH0_MGMT_CLIENT_SECRET!,
  headers: {
    'auth0-custom-domain': process.env.AUTH0_ISSUER_BASE_URL!.replace('https://', '')
  }
});

// Create invitation with custom domain
await customDomainClient.organizations.createInvitation(
  { id: orgId },
  invitationPayload
);
```

**Key Points:**
- The `auth0-custom-domain` header is **required** for organization invitations when multiple custom domains exist
- Without this header, Auth0 returns a 409 Conflict error
- The header value should be the domain only (no `https://`): `login.authskye.org`
- Management API endpoints that support this header: email verification, invitations, user creation, password change tickets, MFA enrollment
- Kong Gateway configuration uses the **canonical domain** for JWT validation (since JWT tokens may still use canonical issuer in some Auth0 configurations)

**Verification:**
Test that custom domain endpoints are accessible:
```bash
# OpenID configuration
curl https://login.authskye.org/.well-known/openid-configuration

# JWKS (public keys)
curl https://login.authskye.org/.well-known/jwks.json
```

### 7. Universal Login Customization

The application uses a **custom Universal Login template** with branded background and healthcare feature highlights positioned on the right side of the login screen.

**Template Location:** `auth0-templates/universal-login-template.html`

**Design:**
- Split background: Dark navy blue (#0a1d73) on left 40%, white on right 60%
- Auth0 widget positioned on left side (100px from edge)
- Healthcare benefit cards displayed on right side with gradient icons
- Responsive: hides features on mobile, centers widget

**Key Implementation Details:**

**Manual Widget Positioning:**
To position the widget on the left, the template omits the `_widget-auto-layout` class from the `<body>` tag and uses custom CSS:

```html
<body>
  <style>
    body {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      padding-left: 100px;
      background: linear-gradient(to right, #0a1d73 0%, #0a1d73 40%, #ffffff 40%, #ffffff 100%);
    }
  </style>

  <div class="features-background">
    <!-- Healthcare features on right side -->
  </div>

  {%- auth0:widget -%}
</body>
```

**Features Displayed:**
1. **Virtual Care** (orange icon) - 24/7 provider access
2. **Track Coverage** (teal icon) - ID card, claims, EOBs
3. **Care Team** (purple icon) - Support and guidance

**Deployment:**
1. Copy contents of `auth0-templates/universal-login-template.html`
2. Navigate to Auth0 Dashboard → Branding → Universal Login
3. Click "Advanced Customization"
4. Paste template code
5. Click "Save"

**Resetting to Default:**
To remove custom template and return to Auth0 default:
- Auth0 Dashboard → Branding → Universal Login → Advanced Customization
- Click "Reset to Default" button

**Important Notes:**
- Template uses Liquid syntax for dynamic content: `{{ clientName }}`, `{{ organization.display_name }}`
- Features section uses `pointer-events: none` to prevent interaction
- Widget container gets `z-index: 10` to sit above background
- Mobile breakpoint at 968px hides features and centers widget

### 8. Step-Up MFA

Sensitive operations trigger step-up authentication:

```typescript
// In component, redirect to login with step-up flag
const handleDelete = () => {
  window.location.href = '/api/auth/login?stepup=true&returnTo=/reports';
};
```

**Auth0 Action** (deployed in tenant) reads `acr_values` parameter and enforces MFA:
```javascript
if (event.transaction.acr_values.includes('multi-factor')) {
  api.multifactor.enable('any');
}
```

### 9. CIBA (Client-Initiated Backchannel Authentication)

The application implements **CIBA** for high-assurance authentication of sensitive transactions. CIBA enables out-of-band authentication via Auth0 Guardian push notifications, requiring users to approve sensitive operations (like claim submissions with banking information) on their mobile device.

**Documentation:** https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-initiated-backchannel-authentication-flow

**Use Case:** Out-of-network healthcare claim submission with direct deposit information

**Architecture Flow:**
```
User submits form → Initiate CIBA → Auth0 sends Guardian push
                         ↓
                   Poll for approval (every 5 seconds)
                         ↓
              User approves on mobile → Submit claim
```

**Key Components:**
- `src/app/api/ciba/initiate/route.ts` - Initiates CIBA authentication request
- `src/app/api/ciba/poll/route.ts` - Polls Auth0 for approval status
- `src/components/claims/claim-submission-form.tsx` - Claims form with CIBA integration
- `src/components/claims/claims-list.tsx` - Displays submitted claims
- `src/app/claims/page.tsx` - Claims management page (2-column layout)

**Implementation Pattern:**

**1. Initiate CIBA Request:**
```typescript
const cibaResponse = await fetch('/api/ciba/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scope: 'openid profile email',
    binding_message: 'Approve claim: 285.00 USD', // Alphanumerics + +-_.,:# only
  }),
});

const { auth_req_id, expires_in } = await cibaResponse.json();
```

**2. Poll for Approval:**
```typescript
const pollInterval = 5000; // 5 seconds (Auth0 recommended)

const poll = async () => {
  const response = await fetch('/api/ciba/poll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth_req_id }),
  });

  const data = await response.json();

  if (data.status === 'approved') {
    // User approved - proceed with submission
  } else if (data.status === 'pending') {
    // Continue polling
    setTimeout(poll, pollInterval);
  } else if (data.status === 'denied' || data.status === 'expired') {
    // Handle rejection/timeout
  }
};
```

**3. Backend CIBA Initiation:**
```typescript
// src/app/api/ciba/initiate/route.ts
const loginHintPayload = JSON.stringify({
  format: 'iss_sub',
  iss: `https://${process.env.AUTH0_MGMT_DOMAIN}/`, // Canonical domain with trailing slash
  sub: user.sub
});

const cibaParams = new URLSearchParams({
  client_id: process.env.AUTH0_CLIENT_ID!,
  client_secret: process.env.AUTH0_CLIENT_SECRET!,
  scope,
  login_hint: loginHintPayload,
  binding_message, // Optional context for user
  requested_expiry: '300', // Triggers push notification
});

const cibaResponse = await fetch(
  `${process.env.AUTH0_ISSUER_BASE_URL}/oauth/ciba/token`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: cibaParams.toString(),
  }
);
```

**4. Backend Polling:**
```typescript
// src/app/api/ciba/poll/route.ts
const tokenParams = new URLSearchParams({
  client_id: process.env.AUTH0_CLIENT_ID!,
  client_secret: process.env.AUTH0_CLIENT_SECRET!,
  grant_type: 'urn:openid:params:grant-type:ciba',
  auth_req_id,
});

const tokenResponse = await fetch(
  `${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  }
);

const tokenData = await tokenResponse.json();

// Handle responses:
// - authorization_pending: User hasn't responded yet
// - access_token present: User approved
// - access_denied: User denied
// - expired_token: Request expired
// - slow_down: Reduce polling frequency
```

**Critical Implementation Details:**

1. **login_hint Format:**
   - Must be valid JSON with `format: 'iss_sub'`
   - `iss` field must be canonical domain with trailing slash: `https://archfaktor.us.auth0.com/`
   - `sub` field is the user's Auth0 ID
   - Using custom domain for `iss` will cause errors

2. **binding_message Restrictions:**
   - Only alphanumerics, whitespace, and `+-_.,:#` characters allowed
   - No special characters like `$`, parentheses, or quotes
   - Example: `"Approve claim: 285.00 USD"` ✅
   - Example: `"Approve claim for $285"` ❌ (contains `$`)

3. **Polling Configuration:**
   - Poll every 5 seconds (Auth0 recommended, avoids rate limits)
   - Minimum 60-second timeout to allow user response time
   - Handle `slow_down` error by treating as `pending`
   - Continue polling on network errors (temporary issues)

4. **requested_expiry:**
   - Set to `300` seconds (5 minutes) or lower to trigger Guardian push
   - Higher values may use polling-only mode without push

**UI Features:**

- **Demo Data Autofill:** 4 cycling demo scenarios for live demonstrations
- **Compact Form:** Two-column layout with small inputs (h-8, text-xs labels)
- **Auto-Refresh:** Claims list automatically refreshes after successful submission
- **CIBA Status Alert:** Real-time feedback during authentication flow
- **File Upload:** Superbill (PDF) upload with validation

**Claims Data Model:**
```typescript
{
  userId: string,           // Auth0 user ID
  organizationId: string,   // Multi-tenant isolation
  serviceDate: string,      // ISO date
  providerName: string,
  providerNPI?: string,     // National Provider Identifier
  diagnosisCode?: string,   // ICD-10 code
  claimAmount: number,
  description?: string,
  bankInfo: {
    routingNumberLast4: string,  // Only store last 4 digits
    accountNumberLast4: string,  // Only store last 4 digits
  },
  superbillInfo: {
    fileName: string,
    fileSize: number,
    fileType: string,
  },
  status: 'pending' | 'approved' | 'denied',
  submittedAt: string,      // ISO timestamp
}
```

**Security Considerations:**
- Banking information encrypted in transit and at rest
- Only last 4 digits stored in Firestore
- CIBA provides non-repudiation for sensitive transactions
- Guardian push shows transaction context in binding_message
- Auto-logout on CIBA denial to prevent unauthorized access

**Common Issues:**

1. **Polling hangs:** Polling intervals <5 seconds may trigger rate limits
2. **login_hint errors:** Ensure canonical domain with trailing slash
3. **binding_message errors:** Remove special characters, use only allowed set
4. **No Guardian push:** Ensure `requested_expiry` ≤ 300 seconds

### 9. My Account API for MFA Management

⚠️ **CURRENT STATUS: Implementation Complete - Requires Auth0 Configuration**

The application has **Auth0 My Account API** implementation for user self-service MFA management using **Custom Token Exchange (CTE)** pattern (based on https://github.com/awhitmana0/a0-passkeyforms-demo).

**Quick Start:**
- 📋 Configuration: `docs/MY_ACCOUNT_AUTH0_SETUP_CHECKLIST.md` - Step-by-step Auth0 setup
- 🧪 Testing: `docs/MY_ACCOUNT_QUICK_TEST.md` - 5-minute test guide
- 🔍 Troubleshooting: `docs/MY_ACCOUNT_CTE_DIAGNOSTIC.md` - Detailed diagnostics
- 📊 Comparison: `docs/MY_ACCOUNT_PASSKEY_COMPARISON.md` - Reference implementation comparison

**Documentation:** https://auth0.com/docs/manage-users/my-account-api

**Status:** Limited Early Access (requires activation in Auth0 Dashboard)

**Known Issues (RESOLVED):**
- ✅ **FIXED:** Custom Domain Issue - My Account API must use custom domain (`AUTH0_ISSUER_BASE_URL`) NOT canonical domain
  - Token audience: `https://login.authskye.org/me/` (custom domain)
  - API calls MUST use same domain: `https://login.authskye.org/me/authentication-methods`
  - Using canonical domain (`archfaktor.us.auth0.com`) causes 404 errors because audience doesn't match
- Client grant may not be properly configured
- Needs verification that feature flags are enabled in tenant

**Architecture:**
```
Frontend → Next.js API Routes → My Account API (https://{domain}/me/)
                    ↓
            Step-Up Auth Required
```

**Key Components:**
- `src/lib/my-account-api.ts` - My Account API service layer
- `src/lib/step-up-auth.ts` - Step-up authentication utilities
- `src/app/api/mfa/methods/` - MFA management endpoints
- `src/components/profile/mfa-enrollment.tsx` - MFA enrollment UI

**Configuration Requirements:**

1. **Activate My Account API** (in Auth0 Dashboard):
   - Navigate to Applications → APIs
   - Find "MyAccount API" banner
   - Click "Activate"

2. **Configure Scopes** (in application settings):
   ```env
   AUTH0_SCOPE='openid profile email offline_access read:me:authentication_methods create:me:authentication_methods update:me:authentication_methods delete:me:authentication_methods'
   ```

3. **Create Client Grant** (for application):
   - Grant your application access to My Account API
   - Include required scopes: `create:me:authentication_methods`, `read:me:authentication_methods`, `update:me:authentication_methods`, `delete:me:authentication_methods`

**API Endpoints:**

All MFA endpoints enforce step-up authentication for enrollment/removal operations:

```typescript
// List enrolled MFA methods
GET /api/mfa/methods

// Enroll new MFA factor (requires step-up)
POST /api/mfa/methods
{
  type: 'sms' | 'phone' | 'email' | 'totp' | 'webauthn-roaming' | 'webauthn-platform',
  phoneNumber?: string,  // Required for SMS/phone
  email?: string,        // Required for email
  name?: string          // Optional display name
}

// Remove specific MFA method (requires step-up)
DELETE /api/mfa/methods/[methodId]

// Reset all MFA (requires step-up)
DELETE /api/mfa/methods

// List available MFA factors
GET /api/mfa/factors
```

**Step-Up Authentication Integration:**

All sensitive MFA operations require step-up authentication:

```typescript
import { requireStepUpAuth, createStepUpResponse, StepUpRequiredError } from '@/lib/step-up-auth';

export const POST = withApiAuthRequired(async function POST(request) {
  try {
    // Require step-up authentication
    await requireStepUpAuth('/profile?tab=security');

    // Proceed with enrollment
    const method = await createAuthenticationMethod(data);
    return NextResponse.json({ success: true, method });
  } catch (error) {
    if (error instanceof StepUpRequiredError) {
      return createStepUpResponse('/profile?tab=security');
    }
    throw error;
  }
});
```

**Frontend Integration:**

The MFA enrollment UI automatically handles step-up authentication:

```typescript
// When step-up is required, frontend receives:
{
  error: 'Step-up authentication required',
  code: 'STEP_UP_REQUIRED',
  requiresStepUp: true,
  redirectUrl: '/api/auth/login?stepup=true&returnTo=/profile?tab=security'
}

// Frontend redirects user to complete MFA
if (response.status === 403 && data.requiresStepUp) {
  window.location.href = data.redirectUrl;
}
```

**Supported MFA Factor Types:**
- **SMS** - Text message verification codes
- **Phone** - Voice call verification codes
- **TOTP** - Time-based one-time passwords (Google Authenticator, Authy)
- **Passkey** - Cross-device and platform credentials using WebAuthn
- **Email** - Email verification codes

**Passkey Support:**
The application has **full passkey support** via Auth0 My Account API. Passkeys are a **distinct type** from webauthn-platform and webauthn-roaming, providing phishing-resistant, passwordless authentication using biometrics or hardware security keys.

**Important:** Passkeys use the `passkey` type (not `webauthn-platform` or `webauthn-roaming`). The `passkey` type is cross-device and platform-agnostic, supporting both biometric authenticators and hardware security keys.

**⚠️ Local Development Limitation:**
Passkey enrollment **does not work in local development** (ngrok/localhost) due to WebAuthn security constraints. The RP ID returned by Auth0 (`login.authskye.org`) must be a registrable domain suffix of the current domain, which cannot be satisfied when running on ngrok or localhost. Test passkeys by deploying to Vercel or another hosting platform where you can configure a domain under the custom domain. See `docs/PASSKEY_LOCAL_DEV_LIMITATION.md` for details.

**Passkey Features:**
- **Cross-device authentication**: Can sync via iCloud, Google Account, Microsoft Account
- **Platform-agnostic**: Works on any device with WebAuthn support
- **Biometric support**: Face ID, Touch ID, Windows Hello, Android biometrics
- **Security key support**: YubiKey, Titan Key, Feitian keys
- **Identity linkage**: Optional connection to social login providers

**Enabling Passkeys:**
Set the environment variable:
```env
NEXT_PUBLIC_ENABLED_MFA_FACTORS='sms,totp,email,passkey'
```

**Passkey Enrollment Flow:**
1. User gets My Account API token via CTE
2. User clicks "Passkey" card
3. Frontend initiates enrollment: `POST /api/mfa/methods { type: 'passkey' }`
4. Auth0 returns challenge: `authn_params_public_key`
5. Browser prompts for authentication: `navigator.credentials.create()`
6. User completes authentication (biometric, PIN, or security key)
7. Frontend sends attestation: `POST /api/mfa/methods/{id}/verify`
8. Auth0 verifies and enrolls passkey

**API Request Format:**
```json
{
  "type": "passkey",
  "connection": "google-oauth2",  // Optional: link to identity provider
  "identity_user_id": "123456"    // Optional: external identity ID
}
```

**Security Benefits:**
- Phishing-resistant (credentials bound to domain)
- No shared secrets (private key never leaves device)
- Replay-proof (unique signature per authentication)
- Cross-device sync with platform providers

**Browser Requirements:**
- Chrome 67+, Firefox 60+, Safari 13+, Edge 18+
- Device with biometric hardware OR hardware security key

**Documentation:**
- Full implementation guide: `docs/PASSKEY_IMPLEMENTATION.md`
- API specification: https://auth0.com/docs/api/myaccount/authentication-methods/start-the-enrollment-of-a-supported-authentication-method
- Reference implementation: https://github.com/awhitmana0/a0-passkeyforms-demo

**Rate Limiting:**
- 25 requests per second (tenant level)
- Consider implementing client-side rate limiting for better UX

**Important Notes:**
- My Account API uses user access tokens, not M2M tokens
- **CRITICAL:** When using custom domains, API calls MUST use `AUTH0_ISSUER_BASE_URL` (custom domain), NOT `AUTH0_MGMT_DOMAIN` (canonical domain)
  - Token audience is set to custom domain: `https://login.authskye.org/me/`
  - API endpoint must match: `${AUTH0_ISSUER_BASE_URL}/me/authentication-methods`
  - Mismatch causes 404 errors (token audience doesn't match API domain)
- Access tokens must have My Account API audience: `https://{domain}/me/`
- Client Credentials Flow is NOT supported
- Step-up authentication is enforced for all enrollment/removal operations
- Email verification section remains separate from MFA management (user preference)

**Current Status (December 2024):**
⚠️ **My Account API available - Client Grant Setup Required**

**Critical Setup Step - Client Grant:**
The most common reason for 404 errors is missing the **client grant** that authorizes your application to request My Account API scopes.

**What you need to do:**
1. 🚨 **Create Client Grant** (Auth0 Dashboard → Applications → APIs → MyAccount API)
   - Navigate to "Machine to Machine Applications" tab
   - Toggle your application ON
   - Select these 5 scopes:
     - `create:me:authentication_methods`
     - `read:me:authentication_methods`
     - `update:me:authentication_methods`
     - `delete:me:authentication_methods`
     - `read:me:factors`
   - Click "Update"
   - **Detailed Guide:** `docs/mfa-implementation/CLIENT_GRANT_SETUP.md`

2. ✅ **Update Environment Variables** (already done if you added scopes to `AUTH0_SCOPE`)

3. 🔄 **Restart Server** and re-login to get new access token

**Understanding Client Grants:**
- Having scopes in `AUTH0_SCOPE` = What your app **requests**
- Client grant = What Auth0 **allows** your app to request
- Without the grant, tokens won't have My Account API audience, causing 404 errors

**Available Permissions:**
- `create:me:authentication_methods`, `read:me:authentication_methods`, `update:me:authentication_methods`, `delete:me:authentication_methods`, `read:me:factors`, `create:me:connected_accounts`, `read:me:connected_accounts`, `delete:me:connected_accounts`

**Next Steps:**
1. **First:** Create client grant (see `docs/mfa-implementation/CLIENT_GRANT_SETUP.md`)
2. **Then:** Follow `docs/mfa-implementation/ACTIVATION_CHECKLIST.md`
3. **If issues:** See `docs/mfa-implementation/TROUBLESHOOTING_404.md`
4. **If needed:** Rollback to legacy system (see rollback section below)

**Rollback Information:**

The MFA management system was completely overhauled to use My Account API. If you need to revert to the previous implementation:

**Before State (Legacy MFA System):**
- **File:** `src/components/profile/mfa-enrollment-old.tsx.backup` (backed up)
- **Features:**
  - Email verification section (separate)
  - Phone verification section (separate)
  - Individual MFA factor cards (SMS, TOTP Guardian, TOTP-OTP, WebAuthn, Reset MFA)
  - Each factor had its own enrollment dialog with custom flows
  - Used Guardian enrollment tickets and redirects to Guardian pages
  - SMS enrollment via step-up challenge endpoint `/api/step-up-challenge`
  - TOTP enrollment via `/api/mfa` POST endpoint
  - MFA reset via `/api/mfa-reset` endpoint
  - Phone verification via `/api/mfa-enrollment-complete` endpoint
  - Relied on Management API authenticators endpoints
  - Mixed enrollment patterns (some in-app, some Guardian redirects)

**After State (My Account API System):**
- **File:** `src/components/profile/mfa-enrollment.tsx` (current)
- **Features:**
  - Email verification section (preserved, unchanged)
  - Consolidated "Enrolled Methods" list showing all active MFA factors
  - "Available Authentication Methods" grid with 5 factor types
  - Unified enrollment flow via `/api/mfa/methods` POST endpoint
  - Step-up authentication enforced via `src/lib/step-up-auth.ts`
  - All CRUD operations via My Account API service (`src/lib/my-account-api.ts`)
  - In-dialog enrollment (no Guardian redirects)
  - Consistent RESTful API endpoints
  - Remove individual methods or reset all MFA
  - Clean card-based UI with better UX

**How to Revert to Legacy System:**

If My Account API feature flags are not available or issues arise, revert with these steps:

```bash
# 1. Restore old MFA component
mv src/components/profile/mfa-enrollment.tsx src/components/profile/mfa-enrollment-myaccount.tsx
mv src/components/profile/mfa-enrollment-old.tsx.backup src/components/profile/mfa-enrollment.tsx

# 2. Remove My Account API endpoints (optional, they won't be called)
rm -rf src/app/api/mfa/

# 3. Revert AUTH0_SCOPE in .env.local
# Remove: read:me:authentication_methods create:me:authentication_methods update:me:authentication_methods delete:me:authentication_methods
# Keep: openid profile email offline_access read:reports create:reports edit:reports delete:reports read:analytics

# 4. Restart dev server
npm run dev
```

**After reverting, the old system will work with these API endpoints:**
- `/api/mfa` - GET (list enrollments), POST (create enrollment), DELETE (remove enrollment)
- `/api/mfa-reset` - POST (reset all MFA)
- `/api/step-up-challenge` - POST (SMS step-up)
- `/api/mfa-any-enrollment` - POST (Guardian enrollment ticket)
- `/api/mfa-enrollment-complete` - POST (phone verification)
- `/api/email-verification` - POST (email verification)

**Files Created for My Account API (can be kept for future use):**
- `src/lib/my-account-api.ts` - My Account API service layer
- `src/lib/step-up-auth.ts` - Step-up authentication utilities
- `src/app/api/mfa/factors/route.ts` - List factors endpoint
- `src/app/api/mfa/methods/route.ts` - Methods CRUD endpoint
- `src/app/api/mfa/methods/[methodId]/route.ts` - Individual method endpoint
- `docs/mfa-implementation/MY_ACCOUNT_API_SETUP.md` - Setup documentation
- `docs/mfa-implementation/MFA_TESTING_GUIDE.md` - Testing documentation
- `docs/mfa-implementation/MFA_IMPLEMENTATION_SUMMARY.md` - Implementation summary
- `docs/mfa-implementation/MFA_ROLLBACK.md` - Rollback instructions
- `docs/mfa-implementation/GIT_COMMIT_MESSAGE.txt` - Pre-written commit message

**Validation Schemas Added:**
In `src/lib/validations.ts`, these schemas were added:
- `mfaMethodIdSchema`
- `enrollMfaFactorSchema`
- `updateMfaMethodSchema`

These schemas are safe to keep even if reverting to the old system.

**When Auth0 Activates My Account API:**

Once the feature flags are enabled in your Auth0 tenant:

1. Switch back to My Account API implementation:
```bash
mv src/components/profile/mfa-enrollment.tsx src/components/profile/mfa-enrollment-old.tsx.backup
mv src/components/profile/mfa-enrollment-myaccount.tsx src/components/profile/mfa-enrollment.tsx
```

2. Update `.env.local` with My Account API scopes:
```env
AUTH0_SCOPE='openid profile email offline_access read:me:authentication_methods create:me:authentication_methods update:me:authentication_methods delete:me:authentication_methods read:reports create:reports edit:reports delete:reports read:analytics'
```

3. Create client grant in Auth0 Dashboard (Applications → APIs → MyAccount API)

4. Restart server and test enrollment flow

5. Follow `docs/mfa-implementation/MY_ACCOUNT_API_SETUP.md` for complete configuration steps

**Custom Token Exchange (CTE) Implementation:**

The application uses **on-demand token exchange** to obtain My Account API tokens, following the pattern from the Auth0 passkey forms demo.

**How It Works:**
```
1. User visits Security tab
   ↓
2. Clicks "Get My Account API Token"
   ↓
3. Frontend calls POST /api/mfa/auth/get-token
   ↓
4. Backend performs OAuth2 Token Exchange:
   POST https://login.authskye.org/oauth/token
   {
     grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
     client_id: CTE_CLIENT_ID,
     client_secret: CTE_CLIENT_SECRET,
     audience: "https://login.authskye.org/me/",
     scope: "read:me:authentication_methods create:me:authentication_methods ...",
     subject_token: user.sub,
     subject_token_type: "urn:myaccount:cte"
   }
   ↓
5. CTE Action validates request and sets audience
   ↓
6. Token returned to frontend, stored in state
   ↓
7. All MFA API calls include: Authorization: Bearer {token}
```

**Key Components:**
- `src/app/api/mfa/auth/get-token/route.ts` - Token exchange endpoint
- `auth0-actions/custom-token-exchange-basic.js` - CTE Action validator
- Environment variables: `CTE_CLIENT_ID`, `CTE_CLIENT_SECRET`

**Required Auth0 Configuration:**
1. **Token Exchange Profile** - Links CTE Action to applications
2. **CTE Action Deployed** - Validates token type `urn:myaccount:cte`
3. **Token Exchange Grant** - Enabled on CTE M2M application
4. **Applications Linked** - Frontend + CTE M2M in profile

**Critical:** Token audience MUST match API domain (both use custom domain `login.authskye.org`)

### 10. AI Agents Demo (Agents as Principals)

The application includes an **AI Agents Demo** that showcases the "Agents as Principals" pattern from Auth0 FGA. This pattern treats AI/automated agents as first-class principals alongside human users in authorization systems.

**Documentation:** https://docs.fga.dev/modeling/agents/agents-as-principals

**Architecture:**
```
User selects Persona + Agent Type
         ↓
User sends message to Agent
         ↓
Backend parses intent (action + resources)
         ↓
FGA checks BOTH user AND agent permissions
         ↓
Agent responds based on combined authorization
```

**Key Components:**
- `src/app/agents/page.tsx` - Main Agents demo page with chat interface
- `src/app/api/agents/chat/route.ts` - Chat endpoint with FGA permission checks
- `src/app/api/agents/check-permission/route.ts` - Direct FGA permission check endpoint
- `src/app/api/agents/setup-demo/route.ts` - Setup/cleanup demo FGA tuples

**Demo Personas (Users):**
| Persona | Role | Access |
|---------|------|--------|
| Alice Chen | Project Manager | Full access to Project Alpha, read access to Beta |
| Bob Martinez | Developer | Read access to both projects |
| Carol Williams | Support Agent | Limited access to specific issues only |
| Dan Thompson | Organization Admin | Full organization access |

**Demo Agent Types:**
| Agent | Purpose | Permissions |
|-------|---------|-------------|
| Triage Bot | Categorizes/assigns issues | `can_read`, `can_triage` on projects |
| Reporting Bot | Generates reports | `can_read` across organization |
| Support Agent | Handles support tickets | `can_read`, `can_comment` on issues |
| Code Review Bot | Reviews code changes | `can_read`, `can_review` on projects |

**FGA Object Model:**
```
agent:{id}        - AI agents (triage-bot, reporting-bot, etc.)
user:{id}         - Human users (alice-pm, bob-dev, etc.)
project:{id}      - Projects (alpha, beta)
organization:{id} - Organizations (acme)
issue:{id}        - Issues (issue-123, issue-456)

Relations: can_read, can_write, can_triage, can_review, can_comment, can_manage, can_delete
```

**Demo Setup:**
The page includes "Setup Demo" button that creates FGA tuples for all personas and agents. Tuples can be cleaned up with "Cleanup" button.

**Chat Flow:**
1. User selects a persona (simulated user identity)
2. User selects an agent type
3. User sends a message (e.g., "Can you read Project Alpha?")
4. Backend parses intent to determine action and resources
5. FGA checks both user AND agent have required permissions
6. Agent responds explaining authorization result

**Key Principle:**
Both the human user AND the AI agent must have authorization for an action to proceed. This prevents:
- Agents exceeding user permissions
- Users using agents to bypass their own restrictions
- Unauthorized autonomous agent actions

**LLM Integration (Optional):**
When LightLLM is configured, the chat provides intelligent responses. Without LLM, the system uses rule-based responses demonstrating the authorization patterns.

```env
LIGHTLLM_ENDPOINT='https://llm.atko.ai'
LIGHTLLM_API_KEY='sk-...'  # Must start with 'sk-'
LIGHTLLM_MODEL='gpt-4o'
```

**FGA Helper Functions:**
```typescript
import {
  formatAgentId,        // agent:{id}
  formatProjectId,      // project:{id}
  formatOrganizationId, // organization:{id}
  formatIssueId,        // issue:{id}
  checkAgentPermission, // Check if agent has permission
  grantAgentPermission, // Grant agent a permission
  revokeAgentPermission // Revoke agent's permission
} from '@/lib/fga-service';
```

### 11. Kong API Gateway Integration

**Kong Konnect** (`kong-019c989905usehqbh.kongcloud.dev`) sits as an API gateway layer between the frontend and backend APIs, providing JWT validation, rate limiting, CORS handling, and request transformation.

**Architecture Flow:**
```
Browser → Kong Gateway → Next.js API
         ↑            ↓
         Auth0 (JWT validation via JWKS)
```

**Key Components:**
- `src/app/api-gateway/page.tsx` - Kong demo page with Mermaid architecture diagram
- `src/app/api/kong-protected/*` - API routes protected by Kong Gateway
- `src/app/api/auth/token/route.ts` - Endpoint to retrieve Auth0 access token from session
- `src/components/mermaid-diagram.tsx` - Reusable Mermaid.js diagram component

**Kong Plugins Configured:**
1. **OpenID Connect** - Validates Auth0 JWT tokens using JWKS endpoint
2. **CORS** - Handles cross-origin requests from frontend
3. **Rate Limiting** - 100 req/min, 1000 req/hour per consumer
4. **Request Transformer** - Adds `X-Kong-Protected: true` header
5. **Pre-Function** - Lua script to handle OPTIONS preflight requests

**Kong-Protected API Route Pattern:**

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if request came through Kong
    const kongProtected = request.headers.get('X-Kong-Protected');
    if (!kongProtected) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'This endpoint must be accessed through Kong Gateway' },
        { status: 401 }
      );
    }

    // Extract user info from Kong headers (if configured)
    const userId = request.headers.get('X-User-Id');
    const userEmail = request.headers.get('X-User-Email');

    // Fallback: Decode JWT from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf-8'));
      // payload contains: { sub, email, org_id, ... }
    }

    // Business logic
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Request Flow Through Kong:**

1. **Frontend retrieves token** - GET `/api/auth/token` extracts JWT from session (no Auth0 call)
2. **Frontend calls Kong** - Request sent to Kong Gateway URL with `Authorization: Bearer <JWT>`
3. **Kong validates JWT** - Uses cached Auth0 JWKS public keys to verify signature, audience, issuer, expiry
4. **Kong adds headers** - `X-Kong-Protected: true`, `X-Gateway-Version: 1.0`
5. **Kong forwards to Next.js** - Request proxied to upstream Next.js API
6. **Next.js validates** - Checks for `X-Kong-Protected` header, decodes JWT if needed
7. **Response returns** - Kong adds CORS headers and returns response to browser

**Important Notes:**
- Kong validates JWT **locally** using Auth0's public keys (cached from JWKS endpoint)
- Auth0 is NOT called for every request - only to refresh public key cache
- Direct API calls without Kong are blocked by `X-Kong-Protected` header check
- VPN must be disabled for Kong Gateway testing (VPN can block Kong requests)

**Frontend Pattern for Kong Requests:**

```typescript
const fetchWithAuth = async (endpoint: string) => {
  // Get Auth0 access token from session
  const tokenResponse = await fetch('/api/auth/token');
  const { accessToken } = await tokenResponse.json();

  // Call through Kong Gateway
  const response = await fetch(`${KONG_GATEWAY_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.json();
};
```

**Kong Configuration Files:**
- `kong/kong-oidc.yaml` - Declarative Kong configuration with OIDC plugin
- `kong/KONG-SETUP.md` - Complete setup guide for Kong Konnect
- `kong/KONG-TESTING.md` - Testing scenarios and troubleshooting

## Project Structure

```
src/
├── app/
│   ├── api/                    # API Routes (Next.js App Router)
│   │   ├── auth/              # Auth0 handlers, session management
│   │   │   ├── [...auth0]/    # Main Auth0 handler with step-up MFA
│   │   │   ├── backchannel-logout/  # Back-channel logout webhook
│   │   │   ├── token/         # Access token retrieval from session
│   │   │   └── session/       # Session validation/enforcement endpoints
│   │   ├── kong-protected/    # Kong Gateway-protected endpoints
│   │   │   └── analytics/     # Analytics API (requires X-Kong-Protected header)
│   │   ├── agents/            # AI Agents demo endpoints
│   │   │   ├── chat/          # Chat with FGA permission checks
│   │   │   ├── check-permission/ # Direct FGA permission check
│   │   │   └── setup-demo/    # Setup/cleanup demo FGA tuples
│   │   ├── organization/      # Member and role management
│   │   ├── documents/         # Document CRUD (FGA-protected)
│   │   ├── folders/           # Folder CRUD (FGA-protected)
│   │   ├── groups/            # Group management
│   │   └── user/              # User preferences/metadata
│   ├── admin/                 # Admin dashboard pages
│   ├── agents/                # AI Agents demo page (chat + FGA)
│   ├── api-gateway/           # Kong Gateway demo page with Mermaid diagram
│   ├── documents/             # Document management UI
│   ├── analytics/             # Analytics with access request workflow
│   └── reports/               # Reporting interface
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── admin/                 # Admin-specific components
│   ├── mermaid-diagram.tsx    # Mermaid.js diagram renderer
│   ├── session-validator.tsx # Real-time session monitoring
│   └── session-enforcer.tsx  # Single session enforcement
├── lib/
│   ├── validations.ts         # All Zod schemas (SINGLE SOURCE OF TRUTH)
│   ├── fga-service.ts         # Auth0 FGA operations
│   ├── fga-client.ts          # OpenFGA SDK singleton
│   ├── session-revocation.ts  # File-based session tracking
│   ├── auth0-session-manager.ts  # Auth0 session API client
│   ├── auth0-mgmt-client.ts   # Auth0 Management API client
│   ├── firebase-admin.ts      # Firebase Admin SDK initialization
│   └── utils.ts               # Shared utilities
├── auth0-actions/             # Auth0 Actions for deployment
│   ├── mfa-challenge-second-login.js
│   ├── progressive-profiling-amerigas.js
│   └── README.md              # Deployment instructions
└── kong/                      # Kong Gateway configuration
    ├── kong-oidc.yaml         # Declarative Kong config (OIDC)
    ├── KONG-SETUP.md          # Complete setup guide
    └── KONG-TESTING.md        # Testing scenarios
```

## When Adding New Features

### Adding a New API Route

1. **Create schema in `src/lib/validations.ts`:**
```typescript
export const createWidgetSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['typeA', 'typeB']),
});
```

2. **Create route with auth wrapper:**
```typescript
// src/app/api/widgets/route.ts
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { createWidgetSchema } from '@/lib/validations';

export const POST = withApiAuthRequired(async function POST(request) {
  const session = await getSession();
  const user = session?.user;

  if (!user?.sub || !user?.org_id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validation = createWidgetSchema.safeParse(body);

  if (!validation.success) {
    return Response.json(
      { error: 'Validation error', details: validation.error.errors },
      { status: 400 }
    );
  }

  // Business logic
  const widget = {
    ...validation.data,
    organizationId: user.org_id,  // ALWAYS include org_id
    ownerId: user.sub,
    createdAt: new Date().toISOString()
  };

  return Response.json({ success: true, widget });
});
```

3. **If resource needs FGA protection, write ownership tuple:**
```typescript
import { writeTuple, formatUserId, formatDocId } from '@/lib/fga-service';

await writeTuple({
  user: formatUserId(user.sub),
  relation: 'owner',
  object: `widget:${widgetId}`
});
```

### Adding FGA-Protected Resources

1. **Define object type in FGA model** (if not already defined)
2. **Format IDs with proper prefix:** `widget:${id}`
3. **Write ownership tuple on creation**
4. **Check permission before operations:**
```typescript
const canRead = await checkPermission(
  formatUserId(user.sub),
  'can_read',
  `widget:${widgetId}`
);
```
5. **Return tuple info in responses for debugging:**
```typescript
return Response.json({
  widget,
  tupleInfo: [
    { operation: 'created', tuple: { user, relation: 'owner', object } }
  ]
});
```

### Adding User Preferences

User preferences are stored in Auth0 `user_metadata`:

```typescript
// API endpoint to update preferences
import { managementClient } from '@/lib/auth0-mgmt-client';

const userDetails = await managementClient.users.get({ id: user.sub });
const currentMetadata = userDetails.data.user_metadata || {};

const updatedMetadata = {
  ...currentMetadata,
  new_preference: value
};

await managementClient.users.update(
  { id: user.sub },
  { user_metadata: updatedMetadata }
);
```

**Access in components:**
```typescript
const userMetadata = user?.['https://agency-inc-demo.com/user_metadata'] || {};
const preference = userMetadata.new_preference;
```

## Common Patterns & Pitfalls

### ✅ Always Do

- Filter Firestore queries by `organizationId`
- Use Zod schemas from `src/lib/validations.ts`
- Format FGA IDs with proper prefixes before operations
- Wrap API routes with `withApiAuthRequired`
- Return consistent error responses with proper status codes
- Include `tupleInfo` in responses when modifying FGA state
- Use `auth0-custom-domain` header when creating invitations with Management API
- Keep `AUTH0_MGMT_DOMAIN` as the canonical domain, not the custom domain

### ❌ Never Do

- Skip organization filtering in database queries
- Use raw user input without Zod validation
- Forget to format FGA IDs (e.g., using `userId` instead of `user:${userId}`)
- Create resources without `organizationId`
- Block login on session management failures (always try/catch)
- Use template syntax like `{{fields.value}}` in JSON - build objects in code
- Use custom domain for `AUTH0_MGMT_DOMAIN` - always use canonical domain
- Forget `auth0-custom-domain` header when multiple custom domains exist (causes 409 errors)

### 🔧 Debugging

**Session issues:**
1. Check browser console for SessionValidator logs (🔍 prefix)
2. Check `revoked-sessions.json` in project root
3. Check network tab for `/api/auth/session/validate` calls

**FGA permission issues:**
1. Use FGA Dashboard to inspect tuples
2. Check that IDs are formatted correctly (`user:`, `doc:`, etc.)
3. Verify Authorization Model is deployed
4. Use `readTuples(object)` to see all relationships

**Organization isolation issues:**
1. Verify `user.org_id` is present in session
2. Check Firestore queries include `.where('organizationId', '==', user.org_id)`
3. Ensure new resources are created with `organizationId`

**Validation errors:**
1. Check `src/lib/validations.ts` for schema definition
2. Look at `validation.error.errors` for detailed issues
3. Ensure all required fields are provided

**Kong Gateway issues:**
1. Check Network tab for `X-Kong-Protected` and `X-Gateway-Version` headers in response
2. Verify VPN is disabled (VPN can block Kong requests)
3. Check Kong Konnect dashboard for request logs and plugin execution
4. Test direct API call to confirm `X-Kong-Protected` enforcement
5. Verify CORS plugin origins include your frontend URL (no leading/trailing spaces)

**Custom Domain & Invitation issues:**
1. **409 Conflict on invitations**: Missing `auth0-custom-domain` header when multiple domains exist
2. **Verify custom domain is active**: Check Auth0 Dashboard → Branding → Custom Domains for "Verified" status
3. **Test JWKS endpoint**: `curl https://login.authskye.org/.well-known/jwks.json`
4. **Check JWT issuer**: Decode token and verify `iss` claim matches `AUTH0_ISSUER_BASE_URL`
5. **Verify Management API domain**: `AUTH0_MGMT_DOMAIN` should always be canonical domain, never custom domain
6. **Check invitation logs**: Server logs show `🌐 Using custom domain:` when creating invitations

## Environment Variables

See `README.md` for complete list. Key variables:

```env
# Auth0 Core
AUTH0_SECRET=              # openssl rand -hex 32
AUTH0_BASE_URL=            # Your ngrok or production URL
AUTH0_ISSUER_BASE_URL=     # https://login.authskye.org (custom domain)
AUTH0_CLIENT_ID=           # Application client ID
AUTH0_CLIENT_SECRET=       # Application client secret
AUTH0_AUDIENCE=            # API identifier

# Auth0 Management API (M2M)
AUTH0_MGMT_DOMAIN=         # archfaktor.us.auth0.com (canonical domain)
AUTH0_MGMT_CLIENT_ID=      # M2M client ID
AUTH0_MGMT_CLIENT_SECRET=  # M2M client secret

# Auth0 FGA
FGA_STORE_ID=              # FGA store ID
FGA_CLIENT_ID=             # FGA client ID
FGA_CLIENT_SECRET=         # FGA client secret
FGA_API_URL=               # https://api.us1.fga.dev

# Firebase
FIREBASE_SERVICE_ACCOUNT_BASE64=  # Base64-encoded service account JSON

# Kong Gateway
NEXT_PUBLIC_KONG_GATEWAY_URL=     # https://your-gateway.kongcloud.dev
```

## Testing Locally

1. Start dev server: `npm run dev`
2. Start ngrok tunnel: `ngrok http 4020 --domain your-domain.ngrok-free.app`
3. Ensure Auth0 callback URLs point to ngrok domain
4. Verify Auth0 Actions are deployed (see `auth0-actions/README.md`)

## Demo Branches

**`main`** - Original SaaS+ application
**`amerigas-demo`** - MyGasHub propane delivery demo
- Rebranded UI for propane industry
- User preferences stored in `user_metadata`
- Toggle switches for delivery preferences
- Propane-specific dashboard KPIs

When working on demo branches, remember that branding changes are cosmetic - the underlying Auth0/FGA architecture remains the same.

## Critical Files

- `src/lib/validations.ts` - All Zod schemas
- `src/lib/fga-service.ts` - FGA operations
- `src/lib/auth0-session-manager.ts` - Session management
- `src/lib/session-revocation.ts` - Revocation tracking
- `src/app/api/auth/[...auth0]/route.ts` - Auth0 handler with step-up MFA
- `src/app/api/auth/token/route.ts` - Access token retrieval for Kong requests
- `src/app/api/ciba/initiate/route.ts` - CIBA authentication initiation
- `src/app/api/ciba/poll/route.ts` - CIBA approval polling
- `src/app/api/claims/submit/route.ts` - Claim submission (post-CIBA)
- `src/app/api/claims/list/route.ts` - Claims list retrieval
- `src/components/claims/claim-submission-form.tsx` - Claims form with CIBA
- `src/components/claims/claims-list.tsx` - Claims list display
- `src/app/claims/page.tsx` - Claims management page
- `src/app/api/organization/members/route.ts` - Organization invitations with custom domain header
- `src/app/api/kong-protected/analytics/route.ts` - Kong-protected endpoint example
- `src/app/agents/page.tsx` - AI Agents demo page with chat interface
- `src/app/api/agents/chat/route.ts` - Chat endpoint with FGA permission checks
- `src/app/api/agents/setup-demo/route.ts` - Setup/cleanup demo FGA tuples
- `src/app/api-gateway/page.tsx` - Kong Gateway demo page
- `src/components/admin/member-manager.tsx` - Member invitation UI
- `src/components/mermaid-diagram.tsx` - Mermaid diagram component
- `kong/kong-oidc.yaml` - Kong declarative configuration
- `kong/KONG-SETUP.md` - Kong setup guide
- `auth0-templates/universal-login-template.html` - Custom Universal Login template
- `src/app/globals.css` - Global styles and branding colors
- `revoked-sessions.json` - Session blacklist (project root)
- `.env.local` - Environment configuration

## MCP Server Integration

**FGA Modeling MCP Server** is configured for Claude Code to provide expert FGA modeling assistance with both the MCP server and `/fga` skill.

### Setup

**Installation Location:**
```
/Users/violet.archer/Documents/FGA/fga-mcp-skills-quickstart
```

**Claude Code Configuration:**
The MCP server is registered using Claude Code CLI:

```bash
claude mcp add fga -- node /Users/violet.archer/Documents/FGA/fga-mcp-skills-quickstart/dist/index.js
```

**Note:** Configuration is project-specific (stored in `.claude.json`) and applies to this project.

### What It Provides

The MCP server offers:
- **Automatic expert context** - Detects FGA queries and injects relevant guidance (31+ pattern triggers)
- **FGA DSL validation** - Check authorization model syntax
- **Modeling assistance** - Suggest relations and object types
- **Best practices** - OpenFGA and Auth0 FGA patterns
- **Model explanation** - Understand authorization logic
- **1200+ lines of expert knowledge** - Covers OpenFGA, Auth0 FGA, and Zanzibar patterns

### FGA Skill

The `/fga` skill provides structured workflows:
- **Model design** - Interactive authorization model creation
- **DSL validation** - Syntax checking and security review
- **Test generation** - Comprehensive `.fga.yaml` test files
- **Security review** - Permission logic verification
- **Performance optimization** - Efficient tuple strategies
- **Migration planning** - Safe model evolution

### Usage

**Automatic (MCP):** Just ask FGA questions and the server provides context automatically.

**Manual (Skill):** Invoke explicit workflows:
```
/fga design an authorization model for [domain]
/fga review my FGA model
/fga write tests for ./model.fga
/fga optimize my model for performance
```

### Rebuilding

If the MCP server is updated:
```bash
cd /Users/violet.archer/Documents/FGA/fga-mcp-skills-quickstart
npm install
npm run build
```

Then restart Claude Code session with `/exit` and `claude`.

### Current FGA Model

This project uses the following FGA object types:
- `user:{auth0_id}` - Users
- `group:{id}` - Groups (with `member` relation)
- `folder:{id}` - Folders (with `parent` relation)
- `doc:{id}` - Documents

Key relations: `owner`, `viewer`, `can_read`, `can_write`, `can_share`

See `src/lib/fga-service.ts` for helper functions that format IDs properly.

## Additional Resources

- **README.md** - Complete setup instructions and Auth0 Actions
- **auth0-actions/** - Auth0 Action code for deployment
- **kong/** - Kong Gateway configuration and setup guides
- [Auth0 Organizations Docs](https://auth0.com/docs/manage-users/organizations)
- [Auth0 FGA Docs](https://auth0.com/docs/fine-grained-authorization)
- [OpenFGA Docs](https://openfga.dev/docs)
- [Kong Konnect Docs](https://developer.konghq.com)
- [Kong OIDC Plugin](https://developer.konghq.com/plugins/openid-connect/)
- [FGA MCP Skills Quickstart](https://github.com/violetarcher/fga-mcp-skills-quickstart)
- [Original OpenFGA MCP Server](https://github.com/aaguiarz/openfga-modeling-mcp)
