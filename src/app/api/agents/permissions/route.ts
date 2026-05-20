// src/app/api/agents/permissions/route.ts
// Fetches real permissions from FGA for personas and agents
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';
import fgaClient, { isFgaAvailable } from '@/lib/fga-client';

// Simple in-memory cache with TTL
const permissionCache = new Map<string, { data: Record<string, string[]>; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 60 seconds - longer cache to reduce FGA calls

// Resources to check permissions against
const RESOURCES = [
  'organization:acme',
  'project:alpha',
  'project:beta',
  'issue:issue-123',
  'issue:issue-456',
];

// Relations to check for each resource type - reduced to essential relations
const RELATIONS_BY_TYPE: Record<string, string[]> = {
  organization: ['admin', 'member', 'can_read'],
  project: ['owner', 'editor', 'viewer', 'triager', 'reviewer', 'can_read', 'can_write', 'can_triage', 'can_review', 'can_manage'],
  issue: ['reporter', 'assignee', 'commenter', 'can_read', 'can_comment', 'can_assign', 'can_close'],
};

// Helper to delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 500
): Promise<{ result: T | null; rateLimited: boolean }> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, rateLimited: false };
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error?.message?.includes('Rate Limit');

      if (isRateLimit && attempt < maxRetries - 1) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.log(`Rate limited, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await delay(delayMs);
      } else if (!isRateLimit) {
        // Non-rate-limit error, don't retry
        throw error;
      }
    }
  }

  console.error(`Failed after ${maxRetries} retries:`, lastError?.message);
  return { result: null, rateLimited: true };
}

interface PermissionResult {
  permissions: Record<string, string[]>;
  rateLimited: boolean;
  fromCache: boolean;
}

async function getPermissionsForSubject(
  subjectType: 'user' | 'agent',
  subjectId: string
): Promise<PermissionResult> {
  const subject = `${subjectType}:${subjectId}`;
  const cacheKey = subject;

  // Check cache first
  const cached = permissionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { permissions: cached.data, rateLimited: false, fromCache: true };
  }

  const permissions: Record<string, string[]> = {};
  let wasRateLimited = false;

  // Build all checks for batch request
  const allChecks: { user: string; relation: string; object: string }[] = [];

  for (const resource of RESOURCES) {
    const resourceType = resource.split(':')[0];
    const relationsToCheck = RELATIONS_BY_TYPE[resourceType] || [];

    for (const relation of relationsToCheck) {
      allChecks.push({
        user: subject,
        relation,
        object: resource,
      });
    }
  }

  // Use batchCheck with chunking (FGA limit is 20 per batch)
  const batchSize = 10; // Conservative batch size

  for (let i = 0; i < allChecks.length; i += batchSize) {
    const batch = allChecks.slice(i, i + batchSize);

    // Add delay between batches (except first one)
    if (i > 0) {
      await delay(200); // 200ms between batches
    }

    const { result: batchResult, rateLimited } = await retryWithBackoff(async () => {
      return fgaClient.batchCheck({
        checks: batch.map(check => ({
          user: check.user,
          relation: check.relation,
          object: check.object,
        })),
      });
    });

    if (rateLimited) {
      wasRateLimited = true;
      // Continue with partial results
      continue;
    }

    if (batchResult) {
      // Group allowed relations by resource
      for (const checkResult of batchResult.result) {
        if (checkResult.allowed) {
          const resource = checkResult.request.object;
          if (!permissions[resource]) {
            permissions[resource] = [];
          }
          permissions[resource].push(checkResult.request.relation);
        }
      }
    }
  }

  // Only cache if we got complete results (not rate limited)
  if (!wasRateLimited && Object.keys(permissions).length > 0) {
    permissionCache.set(cacheKey, { data: permissions, timestamp: Date.now() });
  }

  // If rate limited and we have cached data, return that instead
  if (wasRateLimited && cached) {
    return { permissions: cached.data, rateLimited: true, fromCache: true };
  }

  return { permissions, rateLimited: wasRateLimited, fromCache: false };
}

export const GET = withApiAuthRequired(async function GET(request: Request) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if FGA is configured
    if (!isFgaAvailable()) {
      return NextResponse.json(
        {
          error: 'FGA not configured',
          message: 'FGA environment variables are not set. Set FGA_API_URL, FGA_STORE_ID, and credentials.',
        },
        { status: 503 }
      );
    }

    const url = new URL(request.url);
    const subjectType = url.searchParams.get('type') as 'user' | 'agent' | null;
    const subjectId = url.searchParams.get('id');

    if (!subjectType || !subjectId) {
      return NextResponse.json(
        { error: 'Missing required query params: type, id' },
        { status: 400 }
      );
    }

    if (subjectType !== 'user' && subjectType !== 'agent') {
      return NextResponse.json(
        { error: 'type must be "user" or "agent"' },
        { status: 400 }
      );
    }

    const { permissions, rateLimited, fromCache } = await getPermissionsForSubject(subjectType, subjectId);

    return NextResponse.json({
      subject: `${subjectType}:${subjectId}`,
      permissions,
      rateLimited,
      fromCache,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

// POST endpoint to check a specific permission
export const POST = withApiAuthRequired(async function POST(request: Request) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if FGA is configured
    if (!isFgaAvailable() || !fgaClient) {
      return NextResponse.json(
        {
          error: 'FGA not configured',
          message: 'FGA environment variables are not set.',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { subjectType, subjectId, relation, resource } = body;

    if (!subjectType || !subjectId || !relation || !resource) {
      return NextResponse.json(
        { error: 'Missing required fields: subjectType, subjectId, relation, resource' },
        { status: 400 }
      );
    }

    const subject = `${subjectType}:${subjectId}`;

    try {
      const result = await fgaClient.check({
        user: subject,
        relation,
        object: resource,
      });

      return NextResponse.json({
        subject,
        relation,
        resource,
        allowed: result.allowed || false,
        checkedAt: new Date().toISOString(),
      });
    } catch (fgaError) {
      // FGA check failed - relation may not exist
      return NextResponse.json({
        subject,
        relation,
        resource,
        allowed: false,
        error: 'FGA check failed',
        checkedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error checking permission:', error);
    return NextResponse.json(
      { error: 'Failed to check permission', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
