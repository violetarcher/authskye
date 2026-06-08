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
10. [Troubleshooting](#troubleshooting)
11. [Additional Resources](#additional-resources)

---

## Prerequisites

- **Node.js** v18 or later
- **npm** or **yarn**
- **Auth0 Account** (free tier available)
- **Firebase Account** (free tier available)
- **ngrok** (for local development with HTTPS callbacks)
- *(Optional)* **OpenAI API Key** or **LightLLM endpoint** (for AI Agents)

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/violetarcher/authskye.git
cd authskye

# 2. Install dependencies
npm install

# 3. Copy environment template and configure
cp .env.example .env.local
# Edit .env.local with your credentials (see Environment Variables section)

# 4. Run development server
npm run dev
```

### Set up ngrok (required for HTTPS)

Auth0 Organization invitations require the application's **Application Login URI** (Initiate Login URI) to be **HTTPS** — Auth0 rejects an `http://` value. Since local dev serves over plain HTTP on `localhost:4020`, ngrok provides the HTTPS URL the app needs. Use a **reserved static domain** (the random per-session URLs change on every restart, which would break your Login URI and callback URLs in Auth0).

First-time setup:

1. Create a free account at [dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)
2. Install the CLI:
   ```bash
   brew install ngrok          # macOS
   # or download from https://ngrok.com/download
   ```
3. Add your authtoken (found at [dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)):
   ```bash
   ngrok config add-authtoken <YOUR_AUTHTOKEN>
   ```
4. Claim a free static domain at [dashboard.ngrok.com/domains](https://dashboard.ngrok.com/domains) (e.g. `your-static-domain.ngrok-free.app`)

Then start the tunnel (run this alongside `npm run dev`):

```bash
ngrok http 4020 --domain your-static-domain.ngrok-free.app
```

Use this static domain as your `AUTH0_BASE_URL` and in all Auth0 application URLs — **Application Login URI** (required as HTTPS for Organization invitations), callback, logout, and web origins.

Open your ngrok static domain (e.g. `https://your-static-domain.ngrok-free.app`) in your browser — always access the app through the ngrok URL, never `http://localhost:4020`, so the HTTPS Login URI and Auth0 callbacks work.

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
read:roles
read:organizations
create:organizations
update:organizations
delete:organizations
read:organization_members
delete:organization_members
read:organization_member_roles
create:organization_member_roles
delete:organization_member_roles
create:organization_invitations
read:organization_connections
create:organization_connections
read:connections
update:connections
read:sessions
delete:sessions
read:authentication_methods
read:guardian_enrollments
create:guardian_enrollment_tickets
create:user_tickets
read:self_service_profiles
create:self_service_profiles
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

### 2. Deploy the Authorization Model

The complete authorization model lives in the [`fga/`](fga/) directory as a **modular model** (`fga.mod`), which combines two modules:

- `core.fga` — `user`, `group`, `folder`, `doc` (documents demo)
- `agents.fga` — `agent`, `organization`, `project`, `issue` (AI Agents demo)

Both modules are **required** — the app's Agents demo will not work without the agents module, and an FGA store holds a single model that must contain all types. Deploy the whole model with the [FGA CLI](https://github.com/openfga/cli):

```bash
# Authenticate the CLI to your store (see FGA CLI docs for credential setup)
fga model write --store-id "$FGA_STORE_ID" --file fga/fga.mod
```

This writes one combined model containing all types. Copy the returned **authorization model ID** into `FGA_MODEL_ID` in `.env.local`.

> The `fga/` directory is the single source of truth for the model. Do not hand-edit the model in the dashboard — update the `.fga` files and re-run `fga model write` so the repo stays in sync.

### 3. Get FGA Credentials

1. Navigate to **Settings → API Keys**
2. Create a new credential
3. Copy Store ID, Client ID, Client Secret, and Model ID to `.env.local`

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

### 4. Create the Token Exchange Profile (Management API only)

> A Custom Token Exchange profile **can only be created via the Management API** — there is no Dashboard UI for it. See [Auth0: Custom Token Exchange](https://auth0.com/docs/authenticate/custom-token-exchange).

Get the **Action ID** of the CTE Action you created in step 3 (from the Action's URL in the Dashboard, or via `GET /api/v2/actions/actions`), then create the profile with a Management API token that has `create:token_exchange_profiles`:

```bash
curl -X POST "https://${AUTH0_MGMT_DOMAIN}/api/v2/token-exchange-profiles" \
  -H "Authorization: Bearer ${MGMT_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Account API Exchange",
    "subject_token_type": "urn:myaccount:cte",
    "action_id": "YOUR_CTE_ACTION_ID",
    "type": "custom_authentication"
  }'
```

The `subject_token_type` must match the value your CTE client sends (and the value checked in the Action). Once created, the profile routes any token exchange request with that subject token type through your CTE Action.

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

> My Account API scopes are requested at exchange time via Custom Token Exchange, **not** through `AUTH0_SCOPE`. Do not add `me:` scopes to `AUTH0_SCOPE`.

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
│   │   └── mfa/            # My Account API endpoints
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
- [Next.js App Router](https://nextjs.org/docs/app)
- [OpenFGA Documentation](https://openfga.dev/docs)

---

## Support

- Check [CLAUDE.md](CLAUDE.md) for detailed architecture documentation
- See [docs/](docs/) for feature-specific guides
- Open an issue for bugs or feature requests

---

Built with Next.js, Auth0, Auth0 FGA, and Firebase.
