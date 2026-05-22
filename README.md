# Authskye - Cloud Workspace Platform

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Auth0](https://img.shields.io/badge/Auth0-EB5424?style=for-the-badge&logo=auth0&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![OpenFGA](https://img.shields.io/badge/OpenFGA-FF6B6B?style=for-the-badge&logo=auth0&logoColor=white)

**Authskye** is a comprehensive B2B/B2C cloud workspace platform demonstrating enterprise-grade identity, authorization, and security patterns using **Auth0** and **Auth0 FGA** (Fine-Grained Authorization).

## What This Demo Showcases

| Feature | Description |
|---------|-------------|
| **Multi-Tenant Organizations** | Auth0 Organizations with role-based access, member management, and branded experiences |
| **Fine-Grained Authorization** | Auth0 FGA (ReBAC) for documents, folders, and hierarchical permission inheritance |
| **CIBA Push Notifications** | Client-Initiated Backchannel Authentication for high-assurance billing approvals |
| **AI Agents Demo** | "Agents as Principals" pattern - AI bots with FGA-controlled permissions |
| **My Account API** | User self-service MFA enrollment with Custom Token Exchange (CTE) |
| **Session Management** | Real-time session monitoring, single-session enforcement, back-channel logout |
| **Step-Up MFA** | Context-aware MFA challenges for sensitive operations |
| **Kong API Gateway** | *(Optional)* JWT validation, rate limiting, and CORS at the gateway layer |

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Environment Variables](#environment-variables)
4. [Auth0 Setup](#auth0-setup)
   - [Application Setup](#1-create-regular-web-application)
   - [M2M Application](#2-create-m2m-application)
   - [API Configuration](#3-create-api)
   - [Roles Setup](#4-create-roles)
   - [Organizations](#5-create-organization)
   - [Auth0 Actions](#6-deploy-auth0-actions)
5. [Auth0 FGA Setup](#auth0-fga-setup)
6. [Firebase Setup](#firebase-setup)
7. [Custom Token Exchange (CTE)](#custom-token-exchange-cte-setup)
8. [My Account API Setup](#my-account-api-setup)
9. [AI Agents / LLM Setup](#ai-agents-llm-setup)
10. [Kong API Gateway (Optional)](#kong-api-gateway-optional)
11. [User Personas](#user-personas-organization-vs-non-organization)
12. [Demo Scenarios](#demo-scenarios)
13. [Troubleshooting](#troubleshooting)
14. [Additional Resources](#additional-resources)

---

## Prerequisites

- **Node.js** v18 or later
- **npm** or **yarn**
- **Auth0 Account** (free tier available)
- **Firebase Account** (free tier available)
- **ngrok** (for local development with HTTPS callbacks)
- *(Optional)* **Kong Konnect Account** (free tier available)
- *(Optional)* **OpenAI API Key** or **LightLLM endpoint** (for AI Agents)

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/authskye-dashboard.git
cd authskye-dashboard

# 2. Install dependencies
npm install

# 3. Copy environment template and configure
cp .env.example .env.local
# Edit .env.local with your credentials (see Environment Variables section)

# 4. Start ngrok tunnel (for Auth0 callbacks)
ngrok http 4020 --domain your-static-domain.ngrok-free.app

# 5. Run development server
npm run dev
```

Open [http://localhost:4020](http://localhost:4020) in your browser.

---

## Environment Variables

Create `.env.local` with the following configuration:

### Core Auth0 Configuration

```env
# Auth0 SDK Configuration
AUTH0_SECRET='[run: openssl rand -hex 32]'
AUTH0_BASE_URL='https://your-domain.ngrok-free.app'
AUTH0_ISSUER_BASE_URL='https://your-tenant.auth0.com'  # Or custom domain
AUTH0_CLIENT_ID='your-app-client-id'
AUTH0_CLIENT_SECRET='your-app-client-secret'
AUTH0_AUDIENCE='https://authskye-api.example.com'
AUTH0_SCOPE='openid profile email offline_access read:reports create:reports edit:reports delete:reports read:analytics'

# Namespace for custom claims (must match Auth0 Action, no trailing slash)
NEXT_PUBLIC_AUTH0_NAMESPACE='https://authskye.com'

# Optional: Specify database connection (leave blank for default)
AUTH0_CONNECTION_ID=''
```

### Auth0 Management API (M2M Application)

```env
AUTH0_MGMT_DOMAIN='your-tenant.auth0.com'  # Always use canonical domain here
AUTH0_MGMT_CLIENT_ID='your-m2m-client-id'
AUTH0_MGMT_CLIENT_SECRET='your-m2m-client-secret'
```

### Auth0 FGA (Fine-Grained Authorization)

```env
FGA_STORE_ID='your-fga-store-id'
FGA_CLIENT_ID='your-fga-client-id'
FGA_CLIENT_SECRET='your-fga-client-secret'
FGA_API_URL='https://api.us1.fga.dev'
FGA_MODEL_ID='your-authorization-model-id'
```

### Firebase

```env
FIREBASE_SERVICE_ACCOUNT_BASE64='[base64-encoded-service-account-json]'
```

### Custom Token Exchange (for My Account API)

```env
CTE_CLIENT_ID='your-cte-m2m-client-id'
CTE_CLIENT_SECRET='your-cte-m2m-client-secret'
```

### AI Agents (Optional)

```env
# Option 1: LightLLM (Okta internal)
LIGHTLLM_ENDPOINT='https://llm.example.com'
LIGHTLLM_API_KEY='sk-...'
LIGHTLLM_MODEL='gpt-4o'

# Option 2: OpenAI
OPENAI_API_KEY='sk-...'
OPENAI_MODEL='gpt-4o'
```

### Kong API Gateway (Optional)

```env
NEXT_PUBLIC_KONG_GATEWAY_URL='https://your-gateway.kongcloud.dev'
```

---

## Auth0 Setup

### 1. Create Regular Web Application

1. Go to **Auth0 Dashboard → Applications → Create Application**
2. Select **Regular Web Application**
3. Name it: `Authskye Dashboard`
4. Configure settings:

| Setting | Value |
|---------|-------|
| **Allowed Callback URLs** | `https://your-domain.ngrok-free.app/api/auth/callback` |
| **Allowed Logout URLs** | `https://your-domain.ngrok-free.app` |
| **Allowed Web Origins** | `https://your-domain.ngrok-free.app` |

5. Under **Advanced Settings → Grant Types**, enable:
   - Authorization Code
   - Refresh Token
   - Client Credentials

6. Copy the **Client ID** and **Client Secret** to your `.env.local`

### 2. Create M2M Application

This application is used for server-side Auth0 Management API calls.

1. Go to **Applications → Create Application**
2. Select **Machine to Machine Application**
3. Name it: `Authskye Backend Manager`
4. Authorize for **Auth0 Management API**
5. Grant the following scopes:

```
read:users
update:users
read:organization_members
create:organization_invitations
read:organization_member_roles
create:organization_member_roles
delete:organization_member_roles
delete:organization_members
read:roles
read:sessions
delete:sessions
read:authenticators
delete:authenticators
create:guardian_enrollment_tickets
```

6. Copy credentials to `.env.local` as `AUTH0_MGMT_CLIENT_ID` and `AUTH0_MGMT_CLIENT_SECRET`

### 3. Create API

1. Go to **Applications → APIs → Create API**
2. Configure:

| Setting | Value |
|---------|-------|
| **Name** | Authskye API |
| **Identifier** | `https://authskye-api.example.com` |

3. Under **Permissions**, add:
   - `read:reports`
   - `create:reports`
   - `edit:reports`
   - `delete:reports`
   - `read:analytics`

4. Enable **RBAC** and **Add Permissions in the Access Token**

### 4. Create Roles

Go to **User Management → Roles** and create:

| Role | Permissions |
|------|-------------|
| **Admin** | All permissions |
| **Editor** | `read:reports`, `create:reports`, `edit:reports` |
| **Viewer** | `read:reports` |
| **Data Analyst** | `read:analytics` |

### 5. Create Organization

1. Go to **Organizations → Create Organization**
2. Name it (e.g., "Acme Corp")
3. Enable the following connections for the organization
4. Enable your `Authskye Dashboard` application for the organization

**Organization Branding (Optional):**

Add logo URL in organization metadata:
```json
{
  "url": "https://your-cdn.com/org-logo.png"
}
```

### 6. Deploy Auth0 Actions

Go to **Actions → Flows → Login** and deploy these Actions:

#### Action 1: RBAC and Session Management

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://authskye.com';

  // Add roles to token
  if (event.authorization) {
    api.idToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
  }

  // Add organization info
  if (event.organization) {
    api.idToken.setCustomClaim(`${namespace}/org_logo`, event.organization.metadata.url);
    api.idToken.setCustomClaim(`${namespace}/org_id`, event.organization.id);
    api.idToken.setCustomClaim(`${namespace}/org_name`, event.organization.name);
  }

  // Add session ID
  if (event.session) {
    api.idToken.setCustomClaim(`${namespace}/session_id`, event.session.id);
  }

  // Add user metadata
  if (event.user.user_metadata) {
    api.idToken.setCustomClaim(`${namespace}/user_metadata`, event.user.user_metadata);
  }
};
```

#### Action 2: Step-Up MFA Enforcement

```javascript
exports.onExecutePostLogin = async (event, api) => {
  if (event.client.client_id !== event.secrets.TARGET_CLIENT_ID) {
    return;
  }

  const isMfaRequested = event.transaction.acr_values.includes(
    'http://schemas.openid.net/pape/policies/2007/06/multi-factor'
  );

  if (isMfaRequested) {
    api.multifactor.enable('any');
  }
};
```

**Required Secret:** `TARGET_CLIENT_ID` = Your application's client ID

### 7. Configure Back-Channel Logout

In your application settings:
- **Back-Channel Logout URI**: `https://your-domain.ngrok-free.app/api/auth/backchannel-logout`

---

## Auth0 FGA Setup

### 1. Create FGA Store

1. Go to [Auth0 FGA Dashboard](https://dashboard.fga.dev/)
2. Create a new store: `authskye-documents`

### 2. Deploy Authorization Model

Navigate to **Authorization Models → Create Model** and paste:

```fga
model
  schema 1.1

type user

type group
  relations
    define member: [user]

type folder
  relations
    define can_create_file: owner
    define owner: [user]
    define parent: [folder]
    define viewer: [user, user:*, group#member] or owner or viewer from parent

type doc
  relations
    define can_change_owner: owner
    define can_read: viewer or owner or viewer from parent
    define can_share: owner or owner from parent
    define can_write: owner or owner from parent
    define owner: [user]
    define parent: [folder]
    define viewer: [user, user:*, group#member]
```

### 3. Get FGA Credentials

1. Navigate to **Settings → API Keys**
2. Create a new credential
3. Copy Store ID, Client ID, Client Secret, and Model ID to `.env.local`

### 4. (Optional) Deploy Agents Module

For the AI Agents demo, deploy this additional model:

```fga
# Agents as Principals - extends core model
type agent
  relations
    define can_act_as: [user]

type project
  relations
    define owner: [user, agent]
    define triager: [user, agent]
    define reviewer: [user, agent]
    define viewer: [user, agent]
    define can_read: viewer or owner
    define can_write: owner
    define can_triage: triager or owner
    define can_review: reviewer or owner

type organization
  relations
    define admin: [user, agent]
    define member: [user, agent]
    define can_read: member or admin
    define can_manage: admin

type issue
  relations
    define reporter: [user]
    define assignee: [user, agent]
    define can_read: reporter or assignee
    define can_comment: reporter or assignee
    define can_assign: [user, agent]
    define can_close: assignee
```

---

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project: `Authskye`

### 2. Enable Firestore

1. Navigate to **Firestore Database**
2. Click **Create Database**
3. Start in **Test Mode** (or configure security rules for production)

### 3. Generate Service Account

1. Go to **Project Settings → Service Accounts**
2. Click **Generate New Private Key**
3. Download the JSON file
4. Base64 encode it:

```bash
base64 -i path/to/serviceAccountKey.json
```

5. Add to `.env.local` as `FIREBASE_SERVICE_ACCOUNT_BASE64`

### 4. Firebase Access via SSO

If your organization uses Google SSO:
1. Ensure your corporate Google account has access to the Firebase project
2. Add team members via **Project Settings → Users and permissions**

---

## Custom Token Exchange (CTE) Setup

CTE is required for the My Account API to work (user self-service MFA enrollment).

### 1. Create CTE M2M Application

1. Go to **Applications → Create Application**
2. Select **Machine to Machine Application**
3. Name it: `Authskye CTE Client`
4. **Do not** authorize for any APIs initially

### 2. Enable Token Exchange Grant

1. In the CTE application settings
2. Go to **Advanced Settings → Grant Types**
3. Enable **Token Exchange** (urn:ietf:params:oauth:grant-type:token-exchange)

### 3. Create Token Exchange Action

Go to **Actions → Library → Create Action**:

**Trigger:** `custom-token-exchange`

```javascript
exports.onExecuteCustomTokenExchange = async (event, api) => {
  // Only handle our custom token type
  if (event.transaction.subject_token_type !== 'urn:myaccount:cte') {
    api.access.deny('Invalid token type');
    return;
  }

  // Set the audience to My Account API
  api.accessToken.setCustomClaim('aud', `https://${event.secrets.AUTH0_DOMAIN}/me/`);
};
```

**Secret:** `AUTH0_DOMAIN` = Your Auth0 domain

### 4. Create Token Exchange Profile

1. Go to **Authentication → Token Exchange Profiles**
2. Click **Create Profile**
3. Configure:
   - **Name:** My Account API Exchange
   - **Subject Token Type:** `urn:myaccount:cte`
   - **Action:** Select your CTE Action
4. Link both your main application and CTE client

### 5. Add Credentials to Environment

```env
CTE_CLIENT_ID='your-cte-client-id'
CTE_CLIENT_SECRET='your-cte-client-secret'
```

---

## My Account API Setup

The My Account API enables user self-service MFA enrollment.

### 1. Activate My Account API

1. Go to **Applications → APIs**
2. Look for the **MyAccount API** banner
3. Click **Activate**

### 2. Create Client Grant

1. In MyAccount API settings, go to **Machine to Machine Applications**
2. Toggle **ON** your `Authskye Dashboard` application
3. Expand and select these scopes:
   - `create:me:authentication_methods`
   - `read:me:authentication_methods`
   - `update:me:authentication_methods`
   - `delete:me:authentication_methods`
   - `read:me:factors`
4. Click **Update**

### 3. Update Application Scopes

Add My Account API scopes to your `AUTH0_SCOPE`:

```env
AUTH0_SCOPE='openid profile email offline_access read:me:authentication_methods create:me:authentication_methods update:me:authentication_methods delete:me:authentication_methods read:reports create:reports edit:reports delete:reports read:analytics'
```

---

## AI Agents / LLM Setup

The AI Agents demo requires an LLM provider for intelligent responses.

### Option 1: OpenAI

```env
OPENAI_API_KEY='sk-...'
OPENAI_MODEL='gpt-4o'  # or gpt-3.5-turbo
```

### Option 2: LightLLM (Okta Internal)

```env
LIGHTLLM_ENDPOINT='https://llm.atko.ai'
LIGHTLLM_API_KEY='sk-...'
LIGHTLLM_MODEL='gpt-4o'
```

### Option 3: No LLM (Fallback Mode)

If no LLM is configured, the Agents demo uses rule-based responses demonstrating the authorization patterns without AI-generated content.

---

## Kong API Gateway (Optional)

Kong provides an additional security layer for API protection.

### 1. Sign Up for Kong Konnect

Visit [Kong Konnect](https://konghq.com/products/kong-konnect/register) (Free tier available)

### 2. Create Gateway Service

1. **Service URL:** `https://your-domain.ngrok-free.app`
2. **Route Path:** `/api/kong-protected/*`

### 3. Configure OIDC Plugin

```yaml
issuer: https://your-tenant.auth0.com/
client_id: your-client-id
client_secret: your-client-secret
auth_methods:
  - bearer
audience_required:
  - https://authskye-api.example.com
```

### 4. Add Environment Variable

```env
NEXT_PUBLIC_KONG_GATEWAY_URL='https://your-gateway.kongcloud.dev'
```

See [kong/KONG-SETUP.md](kong/KONG-SETUP.md) for detailed configuration.

---

## User Personas: Organization vs Non-Organization

The application supports **two types of users** with different experiences:

### Organization Members

Users who belong to an Auth0 Organization see:

| Feature | Available |
|---------|-----------|
| **Home** | ✅ With organization branding |
| **Reports** | ✅ Organization-scoped reports |
| **Billing** | ✅ CIBA-protected payments |
| **Inspector** | ✅ Token debugging |
| **Documents** | ✅ FGA-protected document management |
| **Agents** | ✅ AI Agents demo |
| **API Gateway** | ✅ Kong demo (if configured) |
| **Profile** | ✅ MFA self-service |
| **Admin Dashboard** | ✅ (Admin role only) |
| **Session Management** | ✅ (Admin role only) |
| **Organization Settings** | ✅ (Admin role only) |

**Session Data:**
- `user.org_id` - Organization ID
- `user['https://authskye.com/roles']` - Array of roles
- `user['https://authskye.com/org_name']` - Organization name
- `user['https://authskye.com/org_logo']` - Organization logo URL

### Non-Organization Users (Personal Workspace)

Users without an organization see a personal workspace:

| Feature | Available |
|---------|-----------|
| **Home** | ✅ Personal dashboard |
| **Reports** | ❌ Hidden (requires organization) |
| **Billing** | ✅ Personal payments |
| **Inspector** | ✅ Token debugging |
| **Documents** | ✅ Personal documents |
| **Agents** | ✅ AI Agents demo |
| **API Gateway** | ✅ Kong demo |
| **Profile** | ✅ MFA self-service |
| **Admin Dashboard** | ❌ Hidden |

**Session Data:**
- `user.org_id` - `undefined`
- No organization-specific claims

### Authorization Pattern

Both user types use the same FGA authorization pattern:

```typescript
// FGA is the single source of truth
const canRead = await checkPermission(
  formatUserId(user.sub),  // user:auth0|123456
  'can_read',
  formatDocId(docId)       // doc:abc123
);

// Organization ID in Firestore is metadata only, NOT for authorization
```

---

## Demo Scenarios

### 1. Organization Onboarding

1. Admin invites user via email
2. User receives invitation with organization branding
3. User signs up and joins organization
4. User sees organization-branded experience

### 2. Document Sharing with FGA

1. Create a document (automatic owner permission)
2. Share with colleague by email
3. Colleague sees document in their list
4. Try accessing unshared document → Access Denied

### 3. CIBA Billing Approval

1. Navigate to Billing
2. Fill payment form (use "Fill Demo" button)
3. Submit → Guardian push notification sent
4. Approve on mobile device
5. Payment processed

### 4. AI Agents Authorization

1. Navigate to Agents
2. Setup demo tuples
3. Select persona (Alice/Bob/Carol/Dan)
4. Select agent (Triage/Reporting/Support/Code Review)
5. Ask questions about accessing resources
6. Observe dual authorization (user AND agent must have permission)

### 5. Step-Up MFA

1. Navigate to Reports
2. Try to delete a report
3. MFA challenge appears
4. Complete MFA
5. Report deleted

### 6. Session Management

1. Login from two browsers
2. Second login terminates first session
3. First browser shows "Session Revoked"

---

## Troubleshooting

### FGA Permission Issues

```bash
# Verify FGA is configured
curl -X POST https://api.us1.fga.dev/stores/{store_id}/check \
  -H "Authorization: Bearer {token}" \
  -d '{"user":"user:auth0|123","relation":"can_read","object":"doc:abc"}'
```

- Check user ID format: `user:auth0|123456`
- Check object ID format: `doc:documentId`, `folder:folderId`
- Verify model is deployed

### CIBA Not Working

- Ensure user is enrolled in Guardian
- Check `requested_expiry` ≤ 300 seconds
- Verify `binding_message` uses only allowed characters (alphanumerics, `+-_.,:#`)
- Use canonical domain for `login_hint.iss`

### My Account API 404 Errors

1. Verify client grant is created for MyAccount API
2. Check token audience includes `/me/`
3. Ensure CTE Action is deployed and linked
4. Re-login to get fresh token

### Kong Gateway Issues

- Disable VPN (may block Kong requests)
- Check `X-Kong-Protected` header in responses
- Verify CORS origins include your frontend URL

### Session Revocation Not Working

- Check `revoked-sessions.json` exists and is writable
- Verify back-channel logout URL is configured
- Check M2M app has session scopes

---

## Development Commands

```bash
npm run dev     # Start development server (port 4020)
npm run build   # Build for production
npm run start   # Start production server
npm run lint    # Run ESLint
```

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # Auth0 handlers, session management
│   │   ├── billing/        # CIBA-protected payment submission
│   │   ├── ciba/           # CIBA initiation and polling
│   │   ├── agents/         # AI Agents with FGA checks
│   │   ├── documents/      # FGA-protected documents
│   │   ├── folders/        # FGA-protected folders
│   │   ├── mfa/            # My Account API endpoints
│   │   └── kong-protected/ # Kong Gateway demo
│   ├── billing/            # Payment UI
│   ├── documents/          # Document management UI
│   ├── agents/             # AI Agents chat UI
│   ├── profile/            # MFA enrollment UI
│   └── admin/              # Admin dashboard
├── components/
│   ├── billing/            # Billing form, transactions list
│   ├── admin/              # Member management, sessions
│   └── ui/                 # shadcn/ui components
└── lib/
    ├── fga-service.ts      # FGA client and utilities
    ├── auth0-mgmt-client.ts # Management API client
    ├── firebase-admin.ts   # Firestore client
    └── validations.ts      # Zod schemas
```

---

## Additional Resources

- [Auth0 Documentation](https://auth0.com/docs)
- [Auth0 Organizations](https://auth0.com/docs/manage-users/organizations)
- [Auth0 FGA Documentation](https://docs.fga.dev)
- [Auth0 My Account API](https://auth0.com/docs/api/myaccount)
- [Auth0 CIBA](https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-initiated-backchannel-authentication-flow)
- [Kong Konnect Documentation](https://docs.konghq.com/konnect/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [OpenFGA Documentation](https://openfga.dev/docs)

---

## Support

- Check [CLAUDE.md](CLAUDE.md) for detailed architecture documentation
- See [docs/](docs/) for feature-specific guides
- Open an issue for bugs or feature requests

---

Built with Next.js, Auth0, Auth0 FGA, and Firebase.
