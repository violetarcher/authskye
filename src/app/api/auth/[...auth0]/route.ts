import { handleAuth, handleLogin, handleLogout, handleCallback } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';

export const GET = handleAuth({
  login: async (req: NextRequest, ctx: any) => {
    try {
      const url = new URL(req.url);
      const isStepUp = url.searchParams.get('stepup') === 'true';
      const hasInvitation = !!url.searchParams.get('invitation');
      const isAccessRequest = url.searchParams.get('access_request') === 'true';
      const isMyAccount = url.searchParams.get('myaccount') === 'true';

      // Base authorization parameters
      const authorizationParams: any = {
        acr_values: 'urn:okta:loa:2fa:any'
      };

      // Only force specific connection for organization invitations
      // Otherwise, allow Home Realm Discovery to work for enterprise connections
      // if (process.env.AUTH0_CONNECTION_ID) {
      //   authorizationParams.connection = process.env.AUTH0_CONNECTION_ID;
      // }

      // Configure audience and scopes based on request type
      if (isMyAccount) {
        // My Account API request
        // Audience must match the hostname being called (custom domain)
        // But API calls will go to canonical domain
        const myAccountAudience = `${process.env.AUTH0_ISSUER_BASE_URL}/me/`;

        console.log('🔐 My Account API authentication requested');
        console.log('   Audience (custom domain):', myAccountAudience);
        console.log('   API calls will use canonical domain');

        authorizationParams.audience = myAccountAudience;
        authorizationParams.scope = 'openid profile email offline_access read:me:authentication_methods create:me:authentication_methods update:me:authentication_methods delete:me:authentication_methods';
      } else {
        // Regular login
        authorizationParams.audience = process.env.AUTH0_AUDIENCE;
        authorizationParams.scope = 'openid profile email offline_access read:reports create:reports edit:reports delete:reports read:analytics';
      }

      const loginHint = url.searchParams.get('login_hint');
      if (loginHint) {
        authorizationParams.login_hint = loginHint;
      }

      // Pass organization parameter for org switching
      const organization = url.searchParams.get('organization');
      if (organization && !hasInvitation) {
        authorizationParams.organization = organization;
      }

      // Pass access request parameters to Auth0 Action
      if (isAccessRequest) {
        const requestedRole = url.searchParams.get('requested_role');
        const reason = url.searchParams.get('reason');

        if (requestedRole) {
          authorizationParams.requested_role = requestedRole;
        }
        if (reason) {
          authorizationParams.access_request_reason = reason;
        }
        authorizationParams.access_request = 'true';
      }

      // Handle prompt parameter from URL
      const promptParam = url.searchParams.get('prompt');

      if (isStepUp) {
        // Add MFA params for step-up
        authorizationParams.acr_values = 'http://schemas.openid.net/pape/policies/2007/06/multi-factor';
      } else if (promptParam) {
        // Use explicit prompt parameter if provided (e.g., prompt=none for silent auth)
        authorizationParams.prompt = promptParam;
      } else if (!hasInvitation && !isAccessRequest && !isMyAccount) {
        // Add prompt=login for standard logins, but NOT for invitations, access requests, or My Account API
        // For My Account API, omit prompt to allow Auth0 to handle consent/silent auth appropriately
        authorizationParams.prompt = 'login';
      }

      // For organization invitations, pass the invitation and organization parameters
      if (hasInvitation) {
        const invitation = url.searchParams.get('invitation');
        const organization = url.searchParams.get('organization');

        if (invitation) {
          authorizationParams.invitation = invitation;
        }
        if (organization) {
          authorizationParams.organization = organization;
        }

      }

      // Get returnTo parameter for redirect after login
      const returnTo = url.searchParams.get('returnTo');

      return await handleLogin(req, ctx, {
        authorizationParams,
        returnTo: returnTo || undefined
      });
    } catch (error: any) {
      console.error("Login Handler Error:", error);
      return Response.json(
        { error: error.message },
        { status: error.status || 500 }
      );
    }
  },

  logout: async (req: NextRequest, ctx: any) => {
    try {
      return await handleLogout(req, ctx, {
        returnTo: process.env.AUTH0_BASE_URL
      });
    } catch (error: any) {
      console.error("Logout Handler Error:", error);
      return Response.json(
        { error: error.message },
        { status: error.status || 500 }
      );
    }
  },

  callback: async (req: NextRequest, ctx: any) => {
    try {
      return await handleCallback(req, ctx, {
        afterCallback: async (_req: NextRequest, session: any) => {
          console.log('===== AUTH CALLBACK TRIGGERED =====');

          // Decode ID token to see claims
          if (session.idToken) {
            const base64Payload = session.idToken.split('.')[1];
            const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
            console.log('ID Token Claims:', JSON.stringify(payload, null, 2));
            console.log('AMR Claim:', payload.amr || 'NOT FOUND');
          }

          console.log('===================================');

          return session;
        }
      });
    } catch (error: any) {
      console.error("Callback Handler Error:", error);
      return Response.json(
        { error: error.message },
        { status: error.status || 500 }
      );
    }
  }
});

export const POST = GET;