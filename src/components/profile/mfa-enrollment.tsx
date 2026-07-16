'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Shield,
  Smartphone,
  Key,
  Mail,
  Check,
  Plus,
  Trash2,
  Fingerprint,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Info,
  Copy,
  Send,
  Terminal,
  CheckCircle2,
} from 'lucide-react';
import { hasMyAccountAudience, hasMyAccountScopes, getMyAccountAuthUrl } from '@/lib/my-account-token';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface User {
  sub: string;
  email?: string;
  email_verified?: boolean;
  phone_number?: string;
  phone_verified?: boolean;
}

interface AuthenticationMethod {
  id: string;
  type: string;
  name?: string;
  confirmed: boolean;
  created_at: string;
  last_auth_at?: string;
  phone_number?: string;
  email?: string;
  authenticator_type?: string;
}

interface MFAFactor {
  type: string;
  enabled: boolean;
  name: string;
  description: string;
}

interface MFAEnrollmentProps {
  user?: User;
}

export function MFAEnrollment({ user: initialUser }: MFAEnrollmentProps) {
  // Local user state that can be refreshed from Auth0
  const [currentUser, setCurrentUser] = useState<User | undefined>(initialUser);
  const [enrolledMethods, setEnrolledMethods] = useState<AuthenticationMethod[]>([]);
  const [enrolledPasskeys, setEnrolledPasskeys] = useState<AuthenticationMethod[]>([]);
  const [availableFactors, setAvailableFactors] = useState<MFAFactor[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailVerificationLoading, setEmailVerificationLoading] = useState(false);
  const [addEmailDialogOpen, setAddEmailDialogOpen] = useState(false);
  const [newEmailAddress, setNewEmailAddress] = useState('');
  const [selectedFactor, setSelectedFactor] = useState<MFAFactor | null>(null);
  const [enrollmentData, setEnrollmentData] = useState({ phoneNumber: '', email: '' });
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<AuthenticationMethod | null>(null);
  const [totpEnrollment, setTotpEnrollment] = useState<{
    id: string;
    barcode_uri: string;
    manual_input_code: string;
    auth_session: string;
  } | null>(null);
  const [pushEnrollment, setPushEnrollment] = useState<{
    id: string;
    barcode_uri: string;
    auth_session: string;
  } | null>(null);
  const [otpEnrollment, setOtpEnrollment] = useState<{
    id: string;
    type: string;
    auth_session: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [tokenInfo, setTokenInfo] = useState<{
    hasToken: boolean;
    hasMyAccountAudience: boolean;
    hasMyAccountScopes: boolean;
    needsReauth: boolean;
  }>({
    hasToken: false,
    hasMyAccountAudience: false,
    hasMyAccountScopes: false,
    needsReauth: false,
  });

  // API Testing state
  const [accessToken, setAccessToken] = useState<string>('');
  const [myAccountDomain, setMyAccountDomain] = useState<string>('');
  const [testEndpoint, setTestEndpoint] = useState<string>('/me/v1/authentication-methods');
  const [testMethod, setTestMethod] = useState<string>('GET');
  const [testBody, setTestBody] = useState<string>('');
  const [testResponse, setTestResponse] = useState<{
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: any;
    error?: string;
  }>({});
  const [testLoading, setTestLoading] = useState(false);
  const [enrolledMethodsError, setEnrolledMethodsError] = useState<string | null>(null);

  // Fetch fresh user data from Auth0 (to get updated email/verification status)
  const refreshUserData = async () => {
    try {
      const response = await fetch('/api/user');
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setCurrentUser({
            sub: data.user.user_id,
            email: data.user.email,
            email_verified: data.user.email_verified,
            phone_number: data.user.phone_number,
            phone_verified: data.user.phone_verified,
          });
        }
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  useEffect(() => {
    // Fetch available factors on mount
    fetchAvailableFactors();

    // Fetch fresh user data from Auth0 on mount (session data may be stale)
    refreshUserData();

    // Check if we have a cached My Account API token
    const cachedToken = localStorage.getItem('myAccountToken');
    if (cachedToken) {
      setAccessToken(cachedToken);
      // Pass the token directly since state hasn't updated yet
      fetchEnrolledMethods(cachedToken);
    }
    // Don't auto-fetch - let user click button when they need MFA management
  }, []);

  const fetchAccessToken = async () => {
    try {
      console.log('🔄 Requesting My Account API token via token exchange...');

      // Call the on-demand token exchange endpoint
      const response = await fetch('/api/mfa/auth/get-token', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.accessToken) {
          setAccessToken(data.accessToken);
          // Save to localStorage
          localStorage.setItem('myAccountToken', data.accessToken);

          // CRITICAL: Use custom domain to match token audience
          // Token audience is https://login.authskye.org/me/ so API calls MUST use custom domain
          setMyAccountDomain('https://login.authskye.org');
          console.log('✅ My Account API token received:', {
            audience: data.audience,
            expiresIn: data.expiresIn,
            scope: data.scope,
          });

          toast.success('My Account API token ready', {
            description: 'Loading your MFA methods...',
          });

          // Now fetch enrolled methods - pass token directly since state hasn't updated yet
          await fetchEnrolledMethods(data.accessToken);
        } else {
          console.error('❌ Token exchange response missing token:', data);
          toast.error('Token exchange failed', {
            description: data.message || 'Could not get My Account API token',
          });
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Token exchange failed:', errorData);

        toast.error('Token exchange not configured', {
          description: errorData.message || 'Please configure CTE Action and credentials',
        });
      }
    } catch (error) {
      console.error('❌ Failed to fetch My Account API token:', error);
      toast.error('Failed to get token', {
        description: 'Check console for details',
      });
    }
  };

  const checkTokenCapabilities = async () => {
    try {
      const response = await fetch('/api/auth/token');
      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          const hasAudience = hasMyAccountAudience(data.accessToken);
          const hasScopes = hasMyAccountScopes(data.accessToken);

          console.log('🔍 Token Analysis:', {
            hasToken: true,
            hasMyAccountAudience: hasAudience,
            hasMyAccountScopes: hasScopes,
            needsReauth: !hasAudience || !hasScopes,
          });

          setTokenInfo({
            hasToken: true,
            hasMyAccountAudience: hasAudience,
            hasMyAccountScopes: hasScopes,
            needsReauth: !hasAudience || !hasScopes,
          });

          // If token is valid, set it and fetch enrolled methods
          if (hasAudience && hasScopes) {
            setAccessToken(data.accessToken);
            setMyAccountDomain(process.env.NEXT_PUBLIC_AUTH0_ISSUER_BASE_URL || 'https://login.authskye.org');

            // Fetch enrolled methods automatically
            await fetchEnrolledMethods();

            console.log('✅ Token is valid, enrolled methods loaded');
          }
        } else {
          setTokenInfo({
            hasToken: false,
            hasMyAccountAudience: false,
            hasMyAccountScopes: false,
            needsReauth: true,
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to check token:', error);
    }
  };

  const fetchEnrolledMethods = async (token?: string) => {
    try {
      setEnrolledMethodsError(null); // Clear previous errors

      // Use the provided token or the one from state
      const tokenToUse = token || accessToken;

      if (!tokenToUse) {
        console.log('⚠️ No My Account API token available, skipping enrolled methods fetch');
        return;
      }

      console.log('📋 Fetching enrolled methods from My Account API...');

      // Call My Account API with the token
      const response = await fetch('/api/mfa/methods', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenToUse}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        const allMethods = data.methods || [];

        // Separate passkeys from MFA
        const passkeyTypes = ['passkey', 'webauthn', 'webauthn-roaming', 'webauthn-platform'];
        const passkeys = allMethods.filter((method: AuthenticationMethod) =>
          passkeyTypes.includes(method.type)
        );

        // MFA methods - only include true MFA types
        // Exclude: password, passkeys, and email verification (which doesn't have authenticator_type)
        const mfaMethods = allMethods.filter((method: AuthenticationMethod) => {
          // Only include phone (SMS), totp, push-notification, and email OTP (which has authenticator_type)
          if (method.type === 'phone') return true;
          if (method.type === 'totp') return true;
          if (method.type === 'push-notification') return true;
          // Only include email if it's MFA (has authenticator_type 'oob'), not primary email verification
          if (method.type === 'email' && method.authenticator_type === 'oob') return true;
          return false;
        });

        setEnrolledMethods(mfaMethods);
        setEnrolledPasskeys(passkeys);
        console.log('✅ Loaded authentication methods:', {
          mfa: mfaMethods.length,
          passkeys: passkeys.length,
          total: allMethods.length
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setEnrolledMethodsError(errorData.message || 'Failed to load enrolled methods');
        console.error('❌ Failed to fetch enrolled methods:', response.status, errorData);
      }
    } catch (error) {
      setEnrolledMethodsError('Network error loading methods');
      console.error('❌ Error fetching enrolled methods:', error);
    }
  };

  const fetchAvailableFactors = async () => {
    try {
      const response = await fetch('/api/mfa/factors');
      if (response.ok) {
        const data = await response.json();
        setAvailableFactors(data.factors || []);
        console.log('✅ Loaded available factors:', data.factors?.length || 0);
      } else {
        console.error('❌ Failed to fetch available factors:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching available factors:', error);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpEnrollment || !verificationCode) {
      toast.error('Please enter verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/mfa/methods/${otpEnrollment.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          code: verificationCode,
          auth_session: otpEnrollment.auth_session,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Verified!', {
          description: `${otpEnrollment.type === 'sms' ? 'SMS' : 'Email'} enrolled successfully.`,
        });

        // Close dialog
        setOtpEnrollment(null);
        setVerificationCode('');
        setSelectedFactor(null);

        // Wait a moment then refresh (Management API needs time to sync)
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchEnrolledMethods();
      } else {
        toast.error('Verification Failed', {
          description: data.message || 'Invalid code. Please try again.',
        });
      }
    } catch (error) {
      toast.error('Network Error', {
        description: 'Failed to verify code.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuardianPushEnrollment = async () => {
    setLoading(true);
    try {
      // Create Guardian enrollment ticket via Management API
      const response = await fetch('/api/mfa/guardian-ticket', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Guardian enrollment data:', JSON.stringify(data, null, 2));

        setPushEnrollment({
          id: data.enrollment_id,
          barcode_uri: data.barcode_uri,
          auth_session: '',
        });

        toast.success('Guardian Enrollment Ready', {
          description: 'Scan the QR code with Auth0 Guardian app.',
        });

        setEnrollDialogOpen(false);
      } else {
        toast.error('Enrollment Failed', {
          description: data.message || 'Failed to create Guardian enrollment ticket.',
        });
      }
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to initiate Guardian enrollment.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPush = async () => {
    if (!pushEnrollment) {
      toast.error('No push enrollment in progress');
      return;
    }

    setLoading(true);
    try {
      // For Guardian push, approval in the app completes enrollment automatically
      // Just refresh the list to see if it appears
      toast.info('Checking enrollment...', {
        description: 'Refreshing to see if enrollment completed.',
      });

      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      await fetchEnrolledMethods();

      setPushEnrollment(null);
      setSelectedFactor(null);

      toast.success('Done', {
        description: 'If you completed enrollment in Guardian, it should appear above.',
      });
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to check enrollment status.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTotp = async () => {
    if (!totpEnrollment || !verificationCode) {
      toast.error('Please enter verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/mfa/methods/${totpEnrollment.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          code: verificationCode,
          auth_session: totpEnrollment.auth_session,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('TOTP Verified!', {
          description: 'Authenticator app enrolled successfully.',
        });

        // Close dialog
        setTotpEnrollment(null);
        setVerificationCode('');
        setSelectedFactor(null);

        // Wait a moment then refresh (Management API needs time to sync)
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchEnrolledMethods();
      } else {
        toast.error('Verification Failed', {
          description: data.message || 'Invalid code. Please try again.',
        });
      }
    } catch (error) {
      toast.error('Network Error', {
        description: 'Failed to verify code.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollFactor = async () => {
    if (!selectedFactor) return;

    // Passkey requires special handling with browser credential API
    if (selectedFactor.type === 'passkey') {
      await handlePasskeyEnrollment();
      return;
    }

    // WebAuthn (if enabled) requires special handling with browser credential API
    if (selectedFactor.type === 'webauthn-roaming' || selectedFactor.type === 'webauthn-platform') {
      await handleWebAuthnEnrollment(selectedFactor.type);
      return;
    }

    setLoading(true);
    try {
      const requestBody: any = {
        type: selectedFactor.type,
      };

      // Add required fields based on factor type
      if (selectedFactor.type === 'sms' || selectedFactor.type === 'phone') {
        if (!enrollmentData.phoneNumber) {
          toast.error('Phone number required', {
            description: 'Please enter your phone number to enroll SMS authentication.',
          });
          setLoading(false);
          return;
        }
        requestBody.phoneNumber = enrollmentData.phoneNumber;
      }

      if (selectedFactor.type === 'email') {
        if (!enrollmentData.email) {
          toast.error('Email required', {
            description: 'Please enter your email address to enroll email authentication.',
          });
          setLoading(false);
          return;
        }
        requestBody.email = enrollmentData.email;
      }

      const response = await fetch('/api/mfa/methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok || response.status === 202) {
        // Check if verification is required (TOTP, SMS, email, push, etc.)
        if (data.requiresVerification && data.method) {
          console.log('📋 Enrollment pending verification:', data.method);

          // Store TOTP enrollment data to show QR code
          if (selectedFactor.type === 'totp' && data.method.barcode_uri) {
            setTotpEnrollment({
              id: data.method.id,
              barcode_uri: data.method.barcode_uri,
              manual_input_code: data.method.manual_input_code,
              auth_session: data.method.auth_session,
            });
            setVerificationCode('');
            toast.success('Enrollment Initiated', {
              description: `${selectedFactor.name} enrollment started. Scan the QR code.`,
            });
          } else if (selectedFactor.type === 'push-notification' && data.method.barcode_uri) {
            // Push notification enrollment - scan QR code, then confirm with push
            setPushEnrollment({
              id: data.method.id,
              barcode_uri: data.method.barcode_uri,
              auth_session: data.method.auth_session,
            });
            setVerificationCode('');
            toast.success('Enrollment Initiated', {
              description: 'Scan the QR code with Auth0 Guardian app, then approve the push notification.',
            });
          } else {
            // SMS/Email - Auth0 My Account API sends OTP automatically when enrollment is created
            // Just set up the OTP verification dialog
            console.log('📋 SMS/Email enrollment created, OTP sent automatically:', data.method.id);

            // Store OTP enrollment data for verification
            setOtpEnrollment({
              id: data.method.id,
              type: selectedFactor.type,
              auth_session: data.method.auth_session,
            });
            setVerificationCode('');
            toast.success('Verification Code Sent', {
              description: `Check your ${selectedFactor.type === 'sms' ? 'phone' : 'email'} for a verification code.`,
            });
          }

          // Close enroll dialog
          setEnrollDialogOpen(false);
        } else {
          toast.success('MFA Factor Enrolled', {
            description: `${selectedFactor.name} has been successfully enrolled.`,
          });

          // Refresh methods and close dialog
          await fetchEnrolledMethods();
          setEnrollDialogOpen(false);
          setSelectedFactor(null);
          setEnrollmentData({ phoneNumber: '', email: '' });
        }
      } else {
        toast.error('Enrollment Failed', {
          description: data.message || 'Failed to enroll MFA factor. Please try again.',
        });
      }
    } catch (error) {
      toast.error('Network Error', {
        description: 'Failed to connect to server. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyEnrollment = async () => {
    setLoading(true);
    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        toast.error('Not Supported', {
          description: 'Passkeys are not supported in this browser.',
        });
        setLoading(false);
        return;
      }

      // Step 1: Initiate passkey enrollment to get challenge from Auth0
      toast.info('Initiating enrollment...', {
        description: 'Contacting Auth0 to begin passkey setup.',
      });

      const initiateResponse = await fetch('/api/mfa/methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ type: 'passkey' }),
      });

      const initiateData = await initiateResponse.json();

      if (!initiateResponse.ok) {
        throw new Error(initiateData.message || 'Failed to initiate passkey enrollment');
      }

      console.log('✅ Passkey challenge received:', initiateData);

      // Step 2: Use browser's WebAuthn API to create credential
      const { method } = initiateData;

      console.log('🔍 Method object:', method);
      console.log('🔍 Method ID:', method?.id);
      console.log('🔍 Auth session:', method?.auth_session);

      const { authn_params_public_key } = method;

      if (!authn_params_public_key) {
        throw new Error('No passkey challenge received from Auth0');
      }

      // Convert base64url challenge to ArrayBuffer
      const challenge = Uint8Array.from(
        atob(authn_params_public_key.challenge.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
      );

      // Convert user.id from base64url to ArrayBuffer
      const userId = Uint8Array.from(
        atob(authn_params_public_key.user.id.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
      );

      // ALWAYS use Auth0's provided RP ID - don't override
      // Auth0 validates both the RP ID and the origin
      // Cross-Origin Authentication must be enabled in Auth0 Dashboard
      const rpId = authn_params_public_key.rp.id;

      console.log('🔐 WebAuthn RP ID:', {
        auth0Provided: authn_params_public_key.rp.id,
        currentOrigin: window.location.origin,
        usingRpId: rpId,
        note: 'If this fails, ensure "Allow Cross-Origin Authentication" is enabled in Auth0 Dashboard'
      });

      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: authn_params_public_key.rp.name,
          id: rpId, // Use current hostname for local dev, Auth0's RP ID for production
        },
        user: {
          ...authn_params_public_key.user,
          id: userId,
        },
        pubKeyCredParams: authn_params_public_key.pubKeyCredParams,
        timeout: authn_params_public_key.timeout,
        attestation: authn_params_public_key.attestation,
        authenticatorSelection: authn_params_public_key.authenticatorSelection,
      };

      toast.info('Waiting for authenticator...', {
        description: 'Please use your biometric sensor or security key.',
      });

      // Step 3: Create credential with browser API
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('No credential returned from authenticator');
      }

      console.log('✅ Passkey credential created:', credential);

      // Step 4: Send credential response back to Auth0 via verify endpoint
      const response = credential.response as AuthenticatorAttestationResponse;

      // Convert ArrayBuffers to base64url
      const arrayBufferToBase64Url = (buffer: ArrayBuffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      };

      const credentialResponse: any = {
        id: credential.id,
        rawId: arrayBufferToBase64Url(credential.rawId),
        type: credential.type,
        response: {
          attestationObject: arrayBufferToBase64Url(response.attestationObject),
          clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
        },
      };

      // Include transports if available
      if (response.getTransports) {
        credentialResponse.transports = response.getTransports();
      }

      console.log('📤 Credential response to send:', credentialResponse);

      toast.info('Completing enrollment...', {
        description: 'Verifying your passkey with Auth0.',
      });

      // For passkey enrollment verification, use 'passkey|new' as the method ID
      // The actual ID is only generated after successful verification
      const verifyResponse = await fetch(`/api/mfa/methods/passkey|new/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          authn_response: credentialResponse,  // Auth0 expects 'authn_response', not 'credential'
          auth_session: method.auth_session,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyResponse.ok) {
        toast.success('Passkey Enrolled!', {
          description: 'Your passkey has been successfully enrolled.',
        });

        // Refresh methods and close dialog
        await fetchEnrolledMethods();
        setEnrollDialogOpen(false);
        setSelectedFactor(null);
      } else {
        throw new Error(verifyData.message || 'Failed to verify passkey');
      }
    } catch (error: any) {
      console.error('❌ Passkey enrollment failed:', error);

      if (error.name === 'NotAllowedError') {
        toast.error('Enrollment Cancelled', {
          description: 'You cancelled the passkey enrollment.',
        });
      } else if (error.name === 'NotSupportedError') {
        toast.error('Not Supported', {
          description: 'This authenticator type is not supported on your device.',
        });
      } else {
        toast.error('Enrollment Failed', {
          description: error.message || 'Failed to enroll passkey.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWebAuthnEnrollment = async (type: string) => {
    setLoading(true);
    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        toast.error('Not Supported', {
          description: 'WebAuthn is not supported in this browser.',
        });
        setLoading(false);
        return;
      }

      // Step 1: Initiate WebAuthn enrollment to get challenge from Auth0
      toast.info('Initiating enrollment...', {
        description: 'Contacting Auth0 to begin WebAuthn setup.',
      });

      const initiateResponse = await fetch('/api/mfa/methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ type }),
      });

      const initiateData = await initiateResponse.json();

      if (!initiateResponse.ok) {
        throw new Error(initiateData.message || 'Failed to initiate WebAuthn enrollment');
      }

      console.log('✅ WebAuthn challenge received:', initiateData);

      // Step 2: Use browser's WebAuthn API to create credential
      const { method } = initiateData;
      const { authn_params_public_key } = method;

      if (!authn_params_public_key) {
        throw new Error('No WebAuthn challenge received from Auth0');
      }

      // Convert base64url challenge to ArrayBuffer
      const challenge = Uint8Array.from(
        atob(authn_params_public_key.challenge.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
      );

      // Convert user.id from base64url to ArrayBuffer
      const userId = Uint8Array.from(
        atob(authn_params_public_key.user.id.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
      );

      // Override RP ID to match current domain (fix for local development)
      const currentDomain = window.location.hostname;
      const rpId = currentDomain;

      console.log('🔐 WebAuthn RP ID override:', {
        auth0RpId: authn_params_public_key.rp.id,
        overrideRpId: rpId,
        currentDomain: currentDomain
      });

      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: authn_params_public_key.rp.name,
          id: rpId, // Override with current domain
        },
        user: {
          ...authn_params_public_key.user,
          id: userId,
        },
        pubKeyCredParams: authn_params_public_key.pubKeyCredParams,
        timeout: authn_params_public_key.timeout,
        attestation: authn_params_public_key.attestation,
        authenticatorSelection: authn_params_public_key.authenticatorSelection,
      };

      toast.info('Waiting for authenticator...', {
        description: 'Please use your biometric sensor or security key.',
      });

      // Step 3: Create credential with browser API
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('No credential returned from authenticator');
      }

      console.log('✅ Credential created:', credential);

      // Step 4: Send credential response back to Auth0 via verify endpoint
      const response = credential.response as AuthenticatorAttestationResponse;

      // Convert ArrayBuffers to base64url
      const arrayBufferToBase64Url = (buffer: ArrayBuffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      };

      const credentialResponse = {
        id: credential.id,
        rawId: arrayBufferToBase64Url(credential.rawId),
        type: credential.type,
        response: {
          attestationObject: arrayBufferToBase64Url(response.attestationObject),
          clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
        },
      };

      toast.info('Completing enrollment...', {
        description: 'Verifying your credential with Auth0.',
      });

      const verifyResponse = await fetch(`/api/mfa/methods/${method.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          credential: credentialResponse,
          auth_session: method.auth_session,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyResponse.ok) {
        toast.success('Biometric Enrolled!', {
          description: 'Your biometric authentication has been successfully enrolled.',
        });

        // Refresh methods and close dialog
        await fetchEnrolledMethods();
        setEnrollDialogOpen(false);
        setSelectedFactor(null);
      } else {
        throw new Error(verifyData.message || 'Failed to verify credential');
      }
    } catch (error: any) {
      console.error('❌ WebAuthn enrollment failed:', error);

      if (error.name === 'NotAllowedError') {
        toast.error('Enrollment Cancelled', {
          description: 'You cancelled the biometric enrollment.',
        });
      } else if (error.name === 'NotSupportedError') {
        toast.error('Not Supported', {
          description: 'This authenticator type is not supported on your device.',
        });
      } else {
        toast.error('Enrollment Failed', {
          description: error.message || 'Failed to enroll biometric authentication.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMethod = async () => {
    if (!methodToDelete) return;

    if (!accessToken) {
      toast.error('No token', {
        description: 'Please get My Account API token first',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/mfa/methods/${methodToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('MFA Method Removed', {
          description: 'The authentication method has been removed from your account.',
        });

        // Close dialog first
        setDeleteDialogOpen(false);
        setMethodToDelete(null);

        // Wait a moment then refresh (Management API needs time to sync)
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchEnrolledMethods();
      } else {
        toast.error('Removal Failed', {
          description: data.message || 'Failed to remove MFA method. Please try again.',
        });
      }
    } catch (error) {
      toast.error('Network Error', {
        description: 'Failed to connect to server. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupCorrupted = async () => {
    const confirmed = window.confirm(
      'This will remove corrupted MFA enrollments from the legacy system. This is safe and will allow you to enroll methods properly. Continue?'
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch('/api/mfa/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'cleanup' }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Cleanup Successful', {
          description: `Removed ${data.deletedItems?.length || 0} corrupted enrollment(s). Try enrolling again.`,
        });

        // Clear error and refresh
        setEnrolledMethodsError(null);
        if (accessToken) {
          await fetchEnrolledMethods();
        }
      } else {
        toast.error('Cleanup Failed', {
          description: data.message || 'Failed to cleanup corrupted enrollments.',
        });
      }
    } catch (error) {
      toast.error('Network Error', {
        description: 'Failed to connect to server.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetAllMFA = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to remove ALL MFA methods? This will disable multi-factor authentication on your account.'
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch('/api/mfa/reset-all', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('MFA Reset Complete', {
          description: `Removed ${data.deletedCount || 0} authentication method(s).`,
        });

        // Wait a moment then refresh (Management API needs time to sync)
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchEnrolledMethods();
      } else {
        toast.error('Reset Failed', {
          description: data.message || 'Failed to reset MFA. Please try again.',
        });
      }
    } catch (error) {
      toast.error('Network Error', {
        description: 'Failed to connect to server. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailVerification = async () => {
    setEmailVerificationLoading(true);
    try {
      const response = await fetch('/api/user/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast.success('Email verification sent', {
          description: 'Please check your email for the verification link.',
        });
      } else {
        const error = await response.json();
        toast.error('Failed to send email', {
          description: error.details || error.error || 'Failed to send email verification link',
        });
      }
    } catch (error) {
      toast.error('Network error', {
        description: 'Failed to connect to server. Please try again.',
      });
    } finally {
      setEmailVerificationLoading(false);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmailAddress) {
      toast.error('Please enter an email address');
      return;
    }

    setEmailVerificationLoading(true);
    try {
      const response = await fetch('/api/user/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmailAddress }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Email added', {
          description: 'Please check your inbox for a verification link.',
        });
        setAddEmailDialogOpen(false);
        setNewEmailAddress('');
        // Refresh user data to show the new email
        await refreshUserData();
      } else {
        toast.error('Failed to add email', {
          description: data.error || data.details || 'Failed to add email address',
        });
      }
    } catch (error) {
      toast.error('Network error', {
        description: 'Failed to connect to server. Please try again.',
      });
    } finally {
      setEmailVerificationLoading(false);
    }
  };

  const handleTestMyAccountAPI = async () => {
    setLoading(true);
    try {
      // First check the token
      const tokenResponse = await fetch('/api/mfa/auth/test-token');
      const tokenData = await tokenResponse.json();

      console.log('🧪 Token Test Results:', tokenData);

      if (!tokenData.diagnosis.canCallMyAccountAPI) {
        toast.error('Token Issue Detected', {
          description: tokenData.diagnosis.issues.join('. '),
        });
        return;
      }

      // Token looks good, try calling My Account API
      const myAccountResponse = await fetch('/api/mfa/auth/test-myaccount');
      const myAccountData = await myAccountResponse.json();

      console.log('🧪 My Account API Test Results:', myAccountData);

      if (myAccountData.success) {
        toast.success('My Account API Working!', {
          description: `Found ${myAccountData.data?.length || 0} authentication methods.`,
        });
      } else {
        toast.error('My Account API Call Failed', {
          description: myAccountData.recommendations?.[0] || myAccountData.message,
        });
      }
    } catch (error) {
      console.error('Test failed:', error);
      toast.error('Test Failed', {
        description: 'Failed to test My Account API integration.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFactorIcon = (type: string) => {
    const iconClass = 'w-5 h-5';
    switch (type.toLowerCase()) {
      case 'sms':
      case 'phone':
        return <Smartphone className={iconClass} />;
      case 'totp':
        return <Key className={iconClass} />;
      case 'email':
        return <Mail className={iconClass} />;
      case 'passkey':
        return <Fingerprint className={iconClass} />;
      case 'webauthn':
      case 'webauthn-roaming':
      case 'webauthn-platform':
        return <Fingerprint className={iconClass} />;
      default:
        return <Shield className={iconClass} />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Unknown';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleTestEndpoint = async () => {
    setTestLoading(true);
    setTestResponse({});

    try {
      // Validate JSON if body is provided
      let parsedBody = null;
      if (testMethod !== 'GET' && testBody) {
        try {
          parsedBody = JSON.parse(testBody);
        } catch (e) {
          setTestResponse({
            error: 'Invalid JSON in request body',
          });
          setTestLoading(false);
          return;
        }
      }

      const fullUrl = `${myAccountDomain}${testEndpoint}`;

      console.log('🧪 Testing My Account API via proxy:', {
        url: fullUrl,
        method: testMethod,
        endpoint: testEndpoint,
        hasBody: !!parsedBody,
      });

      // Call the proxy endpoint
      const response = await fetch('/api/mfa/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: testMethod,
          endpoint: testEndpoint,
          body: parsedBody,
        }),
      });

      const data = await response.json();

      console.log('🧪 My Account API Response:', data);

      // The proxy returns the actual status in the body
      setTestResponse({
        status: data.status,
        statusText: data.statusText,
        headers: data.headers,
        body: data.body,
        error: data.error,
      });
    } catch (error: any) {
      console.error('🧪 My Account API Error:', error);
      setTestResponse({
        error: error.message || 'Request failed',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'text-gray-600';
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-orange-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* MFA Management Token */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4" />
            MFA Management Token
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">My Account API</span>
            <Badge variant={accessToken ? "default" : "secondary"} className="h-5 text-xs">
              {accessToken ? "Active" : "Not loaded"}
            </Badge>
          </div>
          <Button
            onClick={() => {
              localStorage.removeItem('myAccountToken');
              setAccessToken('');
              fetchAccessToken();
            }}
            disabled={loading}
            className="w-full"
            size="sm"
            variant={accessToken ? "outline" : "default"}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Getting Token...
              </>
            ) : accessToken ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Token
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Get Token
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Email Verification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Add or Verify Email
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center gap-2">
              <Mail className={`w-4 h-4 ${currentUser?.email ? (currentUser?.email_verified ? 'text-green-600' : 'text-orange-600') : 'text-gray-400'}`} />
              <span className="text-sm font-medium">{currentUser?.email || 'No email address'}</span>
            </div>
            {currentUser?.email ? (
              currentUser?.email_verified ? (
                <Badge variant="default" className="bg-green-600 h-6">
                  <Check className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Button
                  onClick={handleSendEmailVerification}
                  disabled={emailVerificationLoading}
                  size="sm"
                  variant="outline"
                >
                  {emailVerificationLoading ? 'Sending...' : 'Send Verification'}
                </Button>
              )
            ) : (
              <Dialog open={addEmailDialogOpen} onOpenChange={setAddEmailDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="default">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Email
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Email Address</DialogTitle>
                    <DialogDescription>
                      Add an email address to your account. You'll receive a verification link.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-email">Email Address</Label>
                      <Input
                        id="new-email"
                        type="email"
                        placeholder="you@example.com"
                        value={newEmailAddress}
                        onChange={(e) => setNewEmailAddress(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddEmailDialogOpen(false);
                        setNewEmailAddress('');
                      }}
                      disabled={emailVerificationLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddEmail}
                      disabled={emailVerificationLoading || !newEmailAddress}
                    >
                      {emailVerificationLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Add & Verify
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Passkeys */}
      {/* <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Fingerprint className="w-4 h-4" />
              Passkeys
            </CardTitle>
            {availableFactors.filter(f => f.type === 'passkey').map((factor) => (
              <Dialog
                key={factor.type}
                open={enrollDialogOpen && selectedFactor?.type === factor.type}
                onOpenChange={(open) => {
                  setEnrollDialogOpen(open);
                  if (!open) setSelectedFactor(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setSelectedFactor(factor)}
                    disabled={loading}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Enroll Passkey</DialogTitle>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEnrollDialogOpen(false)} disabled={loading}>
                      Cancel
                    </Button>
                    <Button onClick={handleEnrollFactor} disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Enroll
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {enrolledPasskeys.length > 0 ? (
            <div className="space-y-2">
              {enrolledPasskeys.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-2 border rounded hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">{method.name || 'Passkey'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {method.confirmed && <Badge variant="default" className="bg-blue-600 h-5 text-xs">Active</Badge>}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setMethodToDelete(method);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={loading}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No passkeys enrolled</p>
          )}
        </CardContent>
      </Card> */}

      {/* MFA */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Multi-Factor Authentication
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchEnrolledMethods()}
                disabled={loading}
                className="h-8"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetAllMFA}
                disabled={loading}
                className="text-red-600 hover:text-red-700 h-8"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Reset MFA
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Enrolled MFA */}
          {enrolledMethods.length > 0 && (
            <div className="space-y-2">
              {enrolledMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-2 border rounded hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <div className="text-green-600">{getFactorIcon(method.type)}</div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{method.name || method.type.toUpperCase()}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {method.phone_number && (
                          <span>{method.phone_number}</span>
                        )}
                        {method.email && (
                          <span>{method.email}</span>
                        )}
                        {method.type === 'totp' && !method.name && (
                          <span>Authenticator App</span>
                        )}
                        {method.type === 'push-notification' && (
                          <span>Guardian Push</span>
                        )}
                        {method.id && (
                          <span className="text-xs text-muted-foreground/60">• ID: {method.id.split('|')[1]?.slice(0, 8) || method.id.slice(0, 8)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {method.confirmed && <Badge variant="default" className="bg-green-600 h-5 text-xs">Active</Badge>}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setMethodToDelete(method);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={loading}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add MFA */}
          <div className="grid grid-cols-2 gap-2">
              {availableFactors
                .filter(factor => factor.type !== 'passkey')
                .map((factor) => (
              <Dialog
                key={factor.type}
                open={enrollDialogOpen && selectedFactor?.type === factor.type}
                onOpenChange={(open) => {
                  setEnrollDialogOpen(open);
                  if (!open) {
                    setSelectedFactor(null);
                    setEnrollmentData({ phoneNumber: '', email: '' });
                  }
                }}
              >
                <DialogTrigger asChild>
                  <button
                    onClick={() => setSelectedFactor(factor)}
                    disabled={loading}
                    className="flex items-center gap-2 p-2 border rounded hover:bg-muted/30 text-left"
                  >
                    {getFactorIcon(factor.type)}
                    <span className="text-sm font-medium">{factor.name}</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Enroll {factor.name}</DialogTitle>
                  </DialogHeader>
                  {(factor.type === 'sms' || factor.type === 'phone') && (
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={enrollmentData.phoneNumber}
                        onChange={(e) =>
                          setEnrollmentData({ ...enrollmentData, phoneNumber: e.target.value })
                        }
                      />
                    </div>
                  )}
                  {factor.type === 'email' && (
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={enrollmentData.email}
                        onChange={(e) =>
                          setEnrollmentData({ ...enrollmentData, email: e.target.value })
                        }
                      />
                    </div>
                  )}
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEnrollDialogOpen(false);
                        setSelectedFactor(null);
                        setEnrollmentData({ phoneNumber: '', email: '' });
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleEnrollFactor} disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Enroll
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Authentication Method</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this authentication method? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          {methodToDelete && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                {getFactorIcon(methodToDelete.type)}
                <div>
                  <p className="font-medium">{methodToDelete.name || methodToDelete.type}</p>
                  <p className="text-sm text-muted-foreground">
                    {methodToDelete.phone_number || methodToDelete.email || methodToDelete.id}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setMethodToDelete(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMethod}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Method'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TOTP QR Code Dialog */}
      <Dialog open={!!totpEnrollment} onOpenChange={() => setTotpEnrollment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* QR Code */}
            <div className="flex justify-center p-4 bg-white rounded-lg">
              {totpEnrollment && (
                <QRCodeSVG
                  value={totpEnrollment.barcode_uri}
                  size={200}
                  level="M"
                />
              )}
            </div>

            {/* Manual Entry */}
            <div className="space-y-2">
              <Label>Or enter manually:</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={totpEnrollment?.manual_input_code || ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (totpEnrollment?.manual_input_code) {
                      navigator.clipboard.writeText(totpEnrollment.manual_input_code);
                      toast.success('Copied to clipboard');
                    }
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Verification Code Input */}
            <div className="space-y-2">
              <Label htmlFor="verify-code">Enter 6-digit code from your app</Label>
              <Input
                id="verify-code"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl font-mono tracking-widest"
              />
            </div>

            {/* Instructions */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>After scanning:</strong> Enter the 6-digit code shown in your authenticator app to complete enrollment.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTotpEnrollment(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleVerifyTotp}
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Complete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Push Notification QR Code Dialog */}
      <Dialog open={!!pushEnrollment} onOpenChange={() => setPushEnrollment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll Guardian Push</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* QR Code */}
            <div className="flex justify-center p-4 bg-white rounded-lg">
              {pushEnrollment && (
                <QRCodeSVG
                  value={pushEnrollment.barcode_uri}
                  size={200}
                  level="M"
                />
              )}
            </div>

            {/* Instructions */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Steps:</strong>
              </p>
              <ol className="text-sm text-blue-800 mt-2 ml-4 list-decimal space-y-1">
                <li>Download Auth0 Guardian app from App Store or Google Play</li>
                <li>Scan this QR code with the Guardian app</li>
                <li>Approve the test push notification in Guardian</li>
                <li>Wait for "Successfully enrolled!" message in Guardian app</li>
                <li>Click "Done" below</li>
              </ol>
            </div>

            {/* Success note */}
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Note:</strong> Once you approve in Guardian, enrollment completes automatically.
                You'll be able to use Guardian push at your next login.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setPushEnrollment(null);
                toast.success('Enrollment Complete', {
                  description: 'Guardian push will be available at your next login.',
                });
              }}
              className="w-full"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMS/Email OTP Verification Dialog */}
      <Dialog open={!!otpEnrollment} onOpenChange={() => setOtpEnrollment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Verification Code</DialogTitle>
            <DialogDescription>
              {otpEnrollment?.type === 'sms'
                ? 'Enter the code sent to your phone via SMS'
                : 'Enter the code sent to your email'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Verification Code Input */}
            <div className="space-y-2">
              <Label htmlFor="otp-code">6-digit code</Label>
              <Input
                id="otp-code"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl font-mono tracking-widest"
                autoFocus
              />
            </div>

            {/* Instructions and Resend */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Didn't receive it?</strong> Check your spam folder or click below to resend.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (!otpEnrollment) return;
                setLoading(true);
                try {
                  // Try the challenge endpoint to resend OTP
                  // Note: This may return 404 if Auth0 doesn't support resending for this enrollment type
                  const challengeResponse = await fetch(`/api/mfa/methods/${encodeURIComponent(otpEnrollment.id)}/challenge`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                      auth_session: otpEnrollment.auth_session,
                    }),
                  });

                  if (challengeResponse.ok) {
                    toast.success('Code Resent', {
                      description: `A new code was sent to your ${otpEnrollment.type === 'sms' ? 'phone' : 'email'}.`,
                    });
                  } else if (challengeResponse.status === 404) {
                    // Challenge endpoint doesn't exist - suggest re-enrolling
                    toast.info('Cannot resend', {
                      description: 'Please cancel and start enrollment again to get a new code.',
                    });
                  } else {
                    const errorData = await challengeResponse.json();
                    toast.error('Failed to resend', {
                      description: errorData.message || 'Could not resend code.',
                    });
                  }
                } catch (error) {
                  toast.error('Network error', {
                    description: 'Failed to resend code.',
                  });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="text-blue-600"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Resend Code
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOtpEnrollment(null)}>
                Cancel
              </Button>
            <Button
              onClick={handleVerifyOtp}
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Complete'
              )}
            </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
