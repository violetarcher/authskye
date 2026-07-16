/**
 * CIBA Transaction Scope — Dynamically grant transaction:pay for CIBA flows
 *
 * With RBAC enabled, scopes don't appear in tokens unless the user has them
 * via a Role — which would grant them permanently on all tokens. Instead, this
 * Action grants transaction:pay only when the flow explicitly requests it.
 * Regular logins never request transaction:pay, so this scope only ever
 * appears in CIBA-issued tokens.
 *
 * Flow: Login / Post Login
 * No secrets required.
 */

exports.onExecutePostLogin = async (event, api) => {
  if (event.transaction?.protocol === 'oidc-ciba') {
    api.accessToken.addScope('transaction:pay');
  }
};
