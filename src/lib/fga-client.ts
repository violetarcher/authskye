// src/lib/fga-client.ts
import { OpenFgaClient } from '@openfga/sdk';

// Check if FGA is configured - don't throw at module load time
const isFgaConfigured = !!(process.env.FGA_API_URL && process.env.FGA_STORE_ID);

let fgaClient: OpenFgaClient | null = null;

if (isFgaConfigured) {
  // Build config object
  const config: any = {
    apiUrl: process.env.FGA_API_URL,
    storeId: process.env.FGA_STORE_ID,
  };

  // Only add authorizationModelId if it's provided and not empty
  if (process.env.FGA_MODEL_ID && process.env.FGA_MODEL_ID.trim() !== '') {
    config.authorizationModelId = process.env.FGA_MODEL_ID;
  }

  // Add credentials if provided
  if (process.env.FGA_CLIENT_ID && process.env.FGA_CLIENT_SECRET) {
    config.credentials = {
      method: 'client_credentials' as const,
      config: {
        clientId: process.env.FGA_CLIENT_ID,
        clientSecret: process.env.FGA_CLIENT_SECRET,
        apiTokenIssuer: process.env.FGA_API_TOKEN_ISSUER,
        apiAudience: process.env.FGA_API_AUDIENCE,
      },
    };
  }

  console.log('Initializing FGA client with config:', {
    apiUrl: config.apiUrl,
    storeId: config.storeId,
    authorizationModelId: config.authorizationModelId,
    hasCredentials: !!config.credentials,
  });

  fgaClient = new OpenFgaClient(config);
} else {
  console.warn('FGA not configured - missing FGA_API_URL or FGA_STORE_ID');
}

// Helper to check if FGA is available
export function isFgaAvailable(): boolean {
  return fgaClient !== null;
}

// Helper to get client with null check
export function getFgaClient(): OpenFgaClient {
  if (!fgaClient) {
    throw new Error('FGA is not configured. Set FGA_API_URL and FGA_STORE_ID environment variables.');
  }
  return fgaClient;
}

export default fgaClient as OpenFgaClient;
