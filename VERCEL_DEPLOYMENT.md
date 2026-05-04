# Vercel Deployment Guide

This guide will help you deploy the CloudSync SaaS application to Vercel with passkey support.

## Prerequisites

- Vercel account (sign up at https://vercel.com)
- Vercel CLI installed (already done: `npm install -g vercel`)
- Custom domain access (e.g., `app.authskye.org`)

## Step 1: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate with your Vercel account.

## Step 2: Deploy to Vercel

From the project root directory:

```bash
vercel
```

This will:
1. Ask you to link to an existing project or create a new one
2. Detect it's a Next.js project
3. Deploy to a preview URL

**Answer the prompts:**
- Set up and deploy? **Y**
- Which scope? **Select your account/team**
- Link to existing project? **N** (first time)
- What's your project's name? **agency-inc-dashboard** (or your preferred name)
- In which directory is your code located? **./** (press Enter)
- Want to modify settings? **N** (we'll set env vars later)

## Step 3: Set Environment Variables

After the initial deployment, you need to add environment variables. There are two ways:

### Option A: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables (use values from your `.env.local`):

**Auth0 Configuration:**
- `AUTH0_SECRET` → Generate new with `openssl rand -hex 32`
- `AUTH0_BASE_URL` → Your Vercel URL (e.g., `https://agency-inc-dashboard.vercel.app`)
- `AUTH0_ISSUER_BASE_URL` → `https://login.authskye.org`
- `AUTH0_CLIENT_ID` → Your Auth0 client ID
- `AUTH0_CLIENT_SECRET` → Your Auth0 client secret
- `AUTH0_AUDIENCE` → `https://b2b-saas-api.example.com`
- `AUTH0_CONNECTION_ID` → `Username-Password-Authentication`
- `AUTH0_SCOPE` → Your scopes (see `.env.local`)

**Auth0 Management API:**
- `AUTH0_MGMT_DOMAIN` → `archfaktor.us.auth0.com`
- `AUTH0_MGMT_CLIENT_ID` → Your M2M client ID
- `AUTH0_MGMT_CLIENT_SECRET` → Your M2M client secret

**Auth0 FGA:**
- `FGA_STORE_ID` → Your FGA store ID
- `FGA_CLIENT_ID` → Your FGA client ID
- `FGA_CLIENT_SECRET` → Your FGA client secret
- `FGA_API_URL` → `https://api.us1.fga.dev`

**Firebase:**
- `FIREBASE_SERVICE_ACCOUNT_BASE64` → Your base64-encoded service account

**Custom Token Exchange (CTE):**
- `CTE_CLIENT_ID` → Your CTE M2M client ID
- `CTE_CLIENT_SECRET` → Your CTE M2M client secret

**Public Variables:**
- `NEXT_PUBLIC_ENABLED_MFA_FACTORS` → `sms,totp,email,passkey`
- `NEXT_PUBLIC_KONG_GATEWAY_URL` → Your Kong Gateway URL (optional)

5. Make sure to select **Production**, **Preview**, and **Development** for each variable

### Option B: Via CLI

```bash
# Example for a few key variables
vercel env add AUTH0_SECRET production
vercel env add AUTH0_BASE_URL production
vercel env add AUTH0_ISSUER_BASE_URL production
# ... repeat for all variables
```

## Step 4: Update Auth0 Configuration

Once deployed, you need to update Auth0 with your new Vercel URLs:

1. **Auth0 Dashboard** → **Applications** → Your Application → **Settings**

2. **Allowed Callback URLs:**
   ```
   https://your-project.vercel.app/api/auth/callback,
   https://app.authskye.org/api/auth/callback
   ```

3. **Allowed Logout URLs:**
   ```
   https://your-project.vercel.app,
   https://app.authskye.org
   ```

4. **Allowed Web Origins:**
   ```
   https://your-project.vercel.app,
   https://app.authskye.org
   ```

## Step 5: Configure Custom Domain (Required for Passkeys)

For passkeys to work, you need a custom domain that matches your Auth0 custom domain hierarchy.

### In Vercel Dashboard:

1. Go to your project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter `app.authskye.org` (or your preferred subdomain)
4. Follow Vercel's instructions to add DNS records

### DNS Configuration:

Add these DNS records to your domain provider:

**For apex domain (authskye.org):**
```
Type: A
Name: app
Value: 76.76.21.21
```

**Or CNAME:**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

### Update Environment Variable:

After domain is configured, update `AUTH0_BASE_URL`:
```bash
vercel env rm AUTH0_BASE_URL production
vercel env add AUTH0_BASE_URL production
# Enter: https://app.authskye.org
```

## Step 6: Update Auth0 WebAuthn Configuration

For passkeys to work with your custom domain:

1. **Auth0 Dashboard** → **Security** → **Multi-factor Auth**
2. Click **WebAuthn with FIDO Security Keys**
3. Configure **Relying Party**:
   - **Relying Party Identifier:** `authskye.org`
   - **Allowed Origins:**
     ```
     https://login.authskye.org
     https://app.authskye.org
     ```
   - **Display Name:** `CloudSync`

## Step 7: Deploy to Production

After setting up environment variables and custom domain:

```bash
vercel --prod
```

This deploys to production with all environment variables.

## Step 8: Test Passkey Enrollment

1. Visit `https://app.authskye.org`
2. Login with your account
3. Go to **Profile** → **Security** tab
4. Click **Get My Account API Token**
5. Try to enroll a passkey
6. ✅ It should now work!

## Troubleshooting

### Build Fails

Check build logs in Vercel dashboard. Common issues:
- Missing environment variables
- TypeScript errors
- Dependency issues

### Auth0 Login Fails

- Verify callback URLs in Auth0 match your Vercel URL
- Check `AUTH0_BASE_URL` environment variable
- Ensure `AUTH0_ISSUER_BASE_URL` is correct

### Passkeys Still Fail

1. **Check browser console** for WebAuthn errors
2. **Verify RP ID** matches your domain:
   - RP ID: `authskye.org`
   - Your URL: `https://app.authskye.org` ✅
3. **Check Auth0 WebAuthn settings** - ensure allowed origins include your domain
4. **Test in different browser** - some browsers have stricter WebAuthn policies

## Useful Vercel Commands

```bash
# View deployment logs
vercel logs

# List all deployments
vercel ls

# Remove a deployment
vercel rm <deployment-url>

# View project info
vercel inspect

# Add environment variable
vercel env add <VAR_NAME> production

# List environment variables
vercel env ls

# Pull environment variables to local .env
vercel env pull .env.vercel
```

## Cost Considerations

Vercel Free Tier includes:
- Unlimited deployments
- 100 GB bandwidth/month
- Automatic HTTPS
- Custom domains

Pro Tier ($20/month) adds:
- More bandwidth
- Password protection
- Analytics
- Priority support

## Next Steps

1. Monitor deployment at https://vercel.com/dashboard
2. Set up custom error pages if needed
3. Configure analytics
4. Set up monitoring/alerts
5. Test all features in production

## Rollback

If something goes wrong, you can instantly rollback:

1. Go to Vercel Dashboard → **Deployments**
2. Find the last working deployment
3. Click **Promote to Production**

Or via CLI:
```bash
vercel rollback
```
