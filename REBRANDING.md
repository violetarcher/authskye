# Rebranding Checklist

This document outlines all areas that need to be updated when rebranding this application.

## Authskye Baseline (Default Brand)

When reverting to default, the app should look like this:

| Property | Value |
|----------|-------|
| Brand name | Authskye |
| Tagline | "The digital platform for modern collaboration" |
| Platform type | B2B + B2C collaboration platform |
| Primary color | `#3b82f6` (blue) |
| Gradient | `from-[#1d4ed8] to-[#3b82f6]` |
| Icon | Shield (lucide `Shield`) |
| Namespace | `https://authskye.com` |
| Theme color (viewport) | `#3b82f6` |

### Baseline content

- **KPI cards:** Active Users, Organizations, Documents Shared, API Requests
- **Activity feed:** document sharing, user invites, org creation, MFA enrollment, role assignment
- **Preferences:** Email Notifications, Activity Alerts, Usage Reports, API Webhooks
- **Billing demo items:** Professional Services, Platform License, Consulting Services
- **Trust indicators:** Enterprise-Grade Security, Multi-Tenant Organizations, Fine-Grained Access Control
- **Footer nav columns:** Product (Features/Pricing/Integrations), Solutions (B2B SaaS/Enterprise/Developers), Company (About/Security/Privacy)

---

## Sportsbook Theme

| Property | Value |
|----------|-------|
| Brand name | Sportsbook |
| Tagline | "Your edge. Every game." |
| Platform type | Sports betting platform |
| Primary color | `#16a34a` (green) |
| Gradient | `from-[#15803d] to-[#16a34a]` |
| Icon | Trophy (lucide `Trophy`) |
| Namespace | `https://authskye.com` |
| Theme color (viewport) | `#16a34a` |

### Sportsbook content

- **KPI cards:** Active Bets, Account Balance, Win Rate, Live Lines
- **Activity feed:** parlay settlements, bets placed, deposits, bet grades, withdrawals
- **Preferences:** Bet Confirmations, Win/Loss Alerts, Promotional Offers, Responsible Gaming Reminders
- **Billing demo items:** NBA Parlay, NFL Moneyline, Player Prop; CIBA binding message "Approve Bet: X USD"
- **Billing labels:** Bet ID, Bet Type, Bet Details, Place Bet button
- **Trust indicators:** Live Odds & Lines, Secure Deposits & Payouts, Responsible Gaming
- **Footer:** Betting (Sports/Live Betting/Parlays), Company (About/Responsible Gaming/Privacy)
- **Footer disclaimer:** Must be 21+. Please play responsibly.

---

## Quick Reference

When rebranding, you need to update:
1. **JWT Namespace** - Custom claims prefix in Auth0 Actions and all code reading claims
2. **App Metadata** - Title, description, theme color
3. **Visual Assets** - Favicon, logos, icons
4. **CSS Theme** - Primary colors, gradients
5. **UI Components** - All user-facing text and placeholders
6. **Documentation** - README, CLAUDE.md, .env.example

---

## 1. JWT Claims Namespace

The namespace is used for custom claims in Auth0 tokens. Must be a valid URL.

### Environment Variable (Recommended)

The namespace is controlled via environment variable. **Simply update one value:**

**`.env.local`:**
```env
NEXT_PUBLIC_AUTH0_NAMESPACE='https://your-new-namespace.com'
```

The application code uses `getClaimKey()` from `src/lib/auth-utils.ts` to build claim keys dynamically:
```typescript
import { getClaimKey } from '@/lib/auth-utils';

// Instead of: user['https://authskye.com/roles']
// Use: user[getClaimKey('roles')]
```

### Files to Update

**Auth0 Actions (deploy in Auth0 Dashboard):**
- `auth0-actions/add-organization-metadata.js`
- `auth0-actions/mfa-challenge-second-login-advanced.js`

**Note:** Auth0 Actions still need manual update as they don't read from your application's env vars.

### Fallback Value

If the environment variable is not set, the fallback is defined in `src/lib/auth-utils.ts`:
```typescript
export const AUTH0_NAMESPACE =
  process.env.NEXT_PUBLIC_AUTH0_NAMESPACE ||
  process.env.AUTH0_NAMESPACE ||
  'https://authskye.com';
```

---

## 2. App Metadata

### `src/app/layout.tsx`
```tsx
export const metadata = {
  title: 'APP_NAME',
  description: 'APP_DESCRIPTION',
};

export const viewport = {
  themeColor: '#HEX_COLOR',
};
```

### `src/app/icon.tsx`
Update the favicon gradient colors and SVG path:
```tsx
background: 'linear-gradient(135deg, #PRIMARY_DARK 0%, #PRIMARY 100%)',
// SVG icon path inside
```

---

## 3. CSS Theme Colors

### `src/app/globals.css`

Update HSL values for primary color:
```css
:root {
  --primary: HUE SATURATION% LIGHTNESS%;
  /* Example: 217 91% 60% for Authskye blue (#3b82f6) */
}
```

Calculate HSL from hex at: https://htmlcolors.com/hex-to-hsl

---

## 4. Sidebar Branding

### `src/components/sidebar.tsx`

Update:
- Import: replace icon import (e.g. `Shield` → brand icon)
- Gradient colors on the logo badge
- Default company name (when no org)

```tsx
const companyName = orgName ? `APP_NAME | ${orgName}` : 'APP_NAME';
```

### `src/components/sidebar-nav.tsx`

Check for any hardcoded brand-specific nav labels (e.g. "Billing", "Documents").

---

## 5. Home Page

### `src/app/page.tsx` (Critical — do not skip)

This file contains **two** components that both need rebranding:

**`WelcomePage`** (shown to unauthenticated users at `/`):
- Nav logo icon, gradient colors, and brand name
- Nav links (Features/Pricing/Docs/Enterprise → domain-appropriate equivalents)
- Hero badge, headline, and subtext
- CTA box title and button labels
- Fine-print disclaimer (e.g. "SOC 2 Type II certified")
- Trust indicators (icons, titles, descriptions) — 3 cards
- Footer brand name, tagline, nav columns, and copyright year

**`Dashboard`** (shown to authenticated users at `/`):
- Welcome subtitle ("your workspace" → domain equivalent)
- `kpiData` array — all four KPI cards (titles, values, change text, icons)
- `recentActivity` array — all five activity rows (action, resource, status)
- Preferences panel: card title, description, all four toggle labels and descriptions
- Metadata keys sent to `/api/user/preferences` (must match what you read back)

---

## 6. Organization Signup

### `src/app/organizations/signup/page.tsx`

Update:
- Page metadata (`title`, `description`)
- Header `<h1>` text ("Welcome to APP_NAME")
- Subheader/tagline

### `src/components/organization/signup-form.tsx`

Update:
- Card title and description
- Input placeholders (organization name, admin email examples)

---

## 7. Billing / CIBA Demo

### `src/components/billing/billing-form.tsx`

Update demo data scenarios (`demoScenarios` array):
- `itemName` values
- `billingCycle` values
- `description` values
- `binding_message` text (shown on push notification)
- `creditorName` value
- Toast messages referencing brand or domain terms
- Button label ("Submit Payment" → domain equivalent)
- **Visible field labels** — these are easy to miss and MUST be updated:
  - Date field label (line ~706): e.g. "Prescription Date" / "Transfer Date"
  - Description field label (line ~739): e.g. "Medication Name" / "Transfer Description"
  - Invoice/reference number label (line ~754): e.g. "Rx Number" / "Reference Number" / "Bet ID"
  - Billing cycle/type label (line ~765): e.g. "Refill Type" / "Plan Type" / "Bet Type" / "Transfer Type"
  - Amount label (line ~717): e.g. "Copay Amount" / "Deposit Amount"
  - Upload label (line ~793): e.g. "Insurance Card / Prescription" / "Supporting Document" / "Bank Statement"
  - Payment details section header (line ~820): e.g. "Insurance Information" / "Bank Details"
- Status/info panel colors (teal → primary, etc.)

### `src/components/billing/transactions-list.tsx`

Update:
- Card title ("Transaction History" → domain equivalent)
- Card description

### `src/components/billing/guardian-enrollment-modal.tsx`

Update:
- Modal description referencing payment/request type

### `src/app/billing/page.tsx`

Update:
- Page `<h1>` title ("Billing" → domain equivalent, e.g. "Rx Refills")
- Page subtitle
- Card title ("New Payment" → domain equivalent)
- Clear dialog title, description, and button label

---

## 8. Documentation

### `README.md`
- Project name and description
- Any brand references in setup instructions

### `CLAUDE.md`
- Project overview
- Brand color references
- Example namespaces and domains

### `.env.example`
- Example audience URLs
- Comments referencing the brand

---

## 9. Other Pages to Check

Run this to find potential brand references:
```bash
# Search for brand terms
grep -ri "BRAND_NAME" src/app/ src/components/

# Search for old namespace
grep -r "OLD_NAMESPACE" src/
```

---

## 10. Auth0 Dashboard Configuration

After code changes, update in Auth0 Dashboard:

1. **Application Settings**
   - Application name
   - Logo URL
   - Application description

2. **Branding → Email Templates**
   - Update email branding
   - Change email sender name

3. **Organizations** (if using)
   - Default organization branding
   - Organization display names

4. **Actions**
   - Redeploy any actions with namespace changes

5. **CIBA `audience` parameter**

   The bc-authorize request in `src/app/api/ciba/initiate/route.ts` includes `audience: process.env.AUTH0_AUDIENCE`. Update `AUTH0_AUDIENCE` in `.env.local` to match the new brand's API identifier.

   > **Note on `authorization_details` (RAR):** Auth0 Guardian requires custom RAR types to have a pre-registered JSON schema. Without that schema registration, including `authorization_details` in the bc-authorize call produces the error _"authorization_details does not match the required schema for use with the Auth0 Guardian App"_. The token inspector in this app displays the authorized transaction details from the form instead.

---

## Verification Checklist

After rebranding, verify:

- [ ] Login page shows new branding (Auth0 Dashboard → Branding)
- [ ] Favicon appears correctly
- [ ] Sidebar shows correct app name and icon
- [ ] Organization signup has new branding and placeholder text
- [ ] Billing page title and nav label match new brand
- [ ] Dashboard KPI cards and activity reflect domain
- [ ] JWT claims use new namespace (check in jwt.io)
- [ ] All API routes read claims from new namespace
- [ ] No console errors about missing claims
- [ ] CIBA flow completes and token inspector shows approved transaction details

---

## Example: Full Rebrand to a New Brand

```bash
# 1. Update namespace in all files
sed -i '' 's|authskye.com|newbrand.com|g' $(grep -rl "authskye.com" src/ auth0-actions/)

# 2. Update brand name references
sed -i '' 's|Authskye|NewBrand|g' $(grep -rl "Authskye" src/)

# 3. Update domain-specific content (manual review needed)
# - src/app/page.tsx (WelcomePage + Dashboard)
# - src/app/billing/page.tsx
# - src/components/billing/billing-form.tsx
# - src/components/organization/signup-form.tsx
# - src/components/sidebar.tsx

# 4. Update colors in globals.css (manual)

# 5. Update icon.tsx (manual)

# 6. Redeploy Auth0 Actions with new namespace

# 7. Test login flow end-to-end
```
