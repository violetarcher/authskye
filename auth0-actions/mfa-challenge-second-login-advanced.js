/**
 * Auth0 Action: Advanced MFA Challenge on Second Login (Non-Organization Users)
 *
 * Trigger: Post-Login
 *
 * Description:
 * Enhanced version with configuration options for MFA enforcement on non-org users.
 *
 * Configuration (Add these as Action Secrets):
 * - MFA_PROVIDER: Specific MFA provider to use (e.g., 'google-authenticator', 'sms', 'email')
 *                 Leave empty to allow 'any'
 * - ALLOW_REMEMBER_BROWSER: 'true' or 'false' - Allow users to remember browser
 * - LOGIN_COUNT_TRIGGER: Number representing which login to trigger MFA (default: 2)
 *
 * @param {Event} event - Details about the user and the context in which they are logging in
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login
 */
exports.onExecutePostLogin = async (event, api) => {
  // Configuration with defaults
  const MFA_PROVIDER = event.secrets.MFA_PROVIDER || 'any';
  const ALLOW_REMEMBER_BROWSER = event.secrets.ALLOW_REMEMBER_BROWSER === 'true';
  const LOGIN_COUNT_TRIGGER = parseInt(event.secrets.LOGIN_COUNT_TRIGGER || '2', 10);

  // Skip if user is logging in as part of an organization
  if (event.organization) {
    console.log(`[MFA Action] Skipping - User is logging into organization: ${event.organization.name} (ID: ${event.organization.id})`);
    return;
  }

  // Check if user is a member of any organization (additional safety check)
  const userOrgs = event.user.org_id || event.user['https://authskye.com/org_id'];
  if (userOrgs) {
    console.log(`[MFA Action] Skipping - User is a member of organization ID: ${userOrgs}`);
    return;
  }

  // Only proceed on the configured login count
  if (event.stats.logins_count !== LOGIN_COUNT_TRIGGER) {
    console.log(`[MFA Action] Skipping - Login count is ${event.stats.logins_count}, target is ${LOGIN_COUNT_TRIGGER}`);
    return;
  }

  console.log(`[MFA Action] Triggering MFA for user: ${event.user.email}`);
  console.log(`[MFA Action] User ID: ${event.user.user_id}`);
  console.log(`[MFA Action] Login count: ${event.stats.logins_count}`);
  console.log(`[MFA Action] Configuration: Provider=${MFA_PROVIDER}, RememberBrowser=${ALLOW_REMEMBER_BROWSER}`);

  // Check if user has enrolled in MFA
  const enrolledFactors = event.user.multifactor || [];
  const hasEnrolledMFA = enrolledFactors.length > 0;

  if (hasEnrolledMFA) {
    console.log(`[MFA Action] User has ${enrolledFactors.length} enrolled factor(s):`, enrolledFactors.map(f => f));
  } else {
    console.log('[MFA Action] User has no enrolled MFA factors');
  }

  // Enable MFA challenge
  try {
    api.multifactor.enable(MFA_PROVIDER, {
      allowRememberBrowser: ALLOW_REMEMBER_BROWSER
    });

    if (!hasEnrolledMFA) {
      console.log('[MFA Action] ✓ MFA enrollment initiated');
    } else {
      console.log('[MFA Action] ✓ MFA challenge initiated');
    }

    // Optional: Add custom claim to token indicating MFA was challenged
    api.idToken.setCustomClaim('https://authskye.com/mfa_challenged_at', new Date().toISOString());
    api.accessToken.setCustomClaim('https://authskye.com/mfa_challenged_at', new Date().toISOString());

  } catch (error) {
    console.error('[MFA Action] ✗ Error enabling MFA:', error.message);
    // Don't block login if MFA fails - just log the error
  }
};

/**
 * Handler that will be invoked when this action is resuming after an external redirect.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login
 */
exports.onContinuePostLogin = async (event, api) => {
  console.log('[MFA Action] MFA flow completed successfully');

  // Optional: Add custom claim indicating MFA was completed
  if (event.authentication?.methods) {
    const mfaMethods = event.authentication.methods.filter(m => m.name === 'mfa');
    if (mfaMethods.length > 0) {
      api.idToken.setCustomClaim('https://authskye.com/mfa_completed_at', new Date().toISOString());
      api.accessToken.setCustomClaim('https://authskye.com/mfa_completed_at', new Date().toISOString());
    }
  }
};
