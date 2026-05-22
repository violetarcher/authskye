# Rebranding Checklist

This document outlines all areas that need to be updated when rebranding this application.

## Quick Reference

When rebranding, you need to update:
1. **JWT Namespace** - Custom claims prefix in Auth0 Actions and all code reading claims
2. **App Metadata** - Title, description, theme color
3. **Visual Assets** - Favicon, logos, icons
4. **Auth0 Templates** - Universal Login customization
5. **CSS Theme** - Primary colors, gradients
6. **UI Components** - All user-facing text and placeholders
7. **Documentation** - README, CLAUDE.md, .env.example

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
Update the favicon - either the SVG path or the gradient colors:
```tsx
background: 'linear-gradient(135deg, #PRIMARY 0%, #SECONDARY 100%)',
// SVG icon inside
```

---

## 3. Universal Login Template

### `auth0-templates/universal-login-template.html`

Update:
- Background gradient colors
- Feature cards content (titles, descriptions, icons)
- Any brand-specific messaging

Key CSS to change:
```css
background: linear-gradient(to right, #PRIMARY 0%, #PRIMARY 40%, #ffffff 40%, #ffffff 100%);

.feature-icon.blue {
  background: linear-gradient(135deg, #PRIMARY 0%, #PRIMARY_LIGHT 100%);
}
```

---

## 4. CSS Theme Colors

### `src/app/globals.css`

Update HSL values for primary color:
```css
:root {
  --primary: HUE SATURATION% LIGHTNESS%;
  /* Example: 217 91% 60% for blue */
}
```

Calculate HSL from hex at: https://htmlcolors.com/hex-to-hsl

---

## 5. Sidebar Branding

### `src/components/sidebar.tsx`

Update:
- Default company name (when no org)
- Fallback icon/logo
- Any hardcoded brand references

```tsx
const companyName = orgName ? `APP_NAME | ${orgName}` : 'APP_NAME';
```

---

## 6. Organization Signup Page

### `src/app/organizations/signup/page.tsx`

Update:
- Page metadata (title, description)
- Header text ("Welcome to APP_NAME")
- Subheader/tagline

### `src/components/organization/signup-form.tsx`

Update:
- Card title and description
- Input placeholders (organization name, email examples)

---

## 7. Billing/Transactions (if applicable)

### `src/components/billing/billing-form.tsx`

Update demo data scenarios:
- Transaction descriptions
- Service names
- Amount examples

### `src/components/billing/transactions-list.tsx`

Update:
- Column headers
- Status labels
- Any domain-specific terminology

### `src/components/billing/guardian-enrollment-modal.tsx`

Update:
- Modal text and descriptions
- Button labels

---

## 8. Documentation

### `README.md`
- Project name and description
- Any brand references in setup instructions
- Example URLs and domains

### `CLAUDE.md`
- Project overview
- Brand color references
- Example namespaces and domains

### `.env.example`
- Example audience URLs
- Example domain placeholders
- Comments referencing the brand

---

## 9. Other Pages to Check

Run this to find potential brand references:
```bash
# Search for common brand terms
grep -ri "energyco\|paw0\|kennel\|dog\|energy" src/app/ src/components/

# Search for old namespace
grep -r "OLD_NAMESPACE" src/
```

Pages that commonly need updates:
- Landing/home page
- About page
- Profile pages
- Settings pages
- Error pages
- Email templates (if any)

---

## 10. Auth0 Dashboard Configuration

After code changes, update in Auth0 Dashboard:

1. **Application Settings**
   - Application name
   - Logo URL
   - Application description

2. **Branding → Universal Login**
   - Upload custom template
   - Set logo and colors

3. **Branding → Email Templates**
   - Update email branding
   - Change email sender name

4. **Organizations** (if using)
   - Default organization branding
   - Organization display names

5. **Actions**
   - Redeploy any actions with namespace changes

---

## Verification Checklist

After rebranding, verify:

- [ ] Login page shows new branding
- [ ] Favicon appears correctly
- [ ] Sidebar shows correct app name
- [ ] Organization signup has new branding
- [ ] JWT claims use new namespace (check in jwt.io)
- [ ] All API routes read claims from new namespace
- [ ] No console errors about missing claims
- [ ] Email templates (if any) show new branding
- [ ] Documentation is updated

---

## Example: Full Rebrand from "Paw0" to "Authskye"

```bash
# 1. Update namespace in all files
sed -i '' 's|paw0\.com|authskye.com|g' $(grep -rl "paw0\.com" src/ auth0-actions/)

# 2. Update brand name references
sed -i '' 's|Paw0|Authskye|g' $(grep -rl "Paw0" src/)
sed -i '' 's|paw0|authskye|g' $(grep -rl "paw0" src/)

# 3. Update domain-specific content (manual review needed)
grep -ri "kennel\|dog\|breed\|pedigree" src/

# 4. Update colors in globals.css (manual)

# 5. Update icon.tsx (manual)

# 6. Update Universal Login template (manual)

# 7. Redeploy Auth0 Actions with new namespace

# 8. Test login flow end-to-end
```
