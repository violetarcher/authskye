// src/app/api/agents/tuples/route.ts
// CRUD operations for agent-related FGA tuples
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';
import fgaClient from '@/lib/fga-client';

// GET - List all tuples for the agents module
export const GET = withApiAuthRequired(async function GET(request: Request) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const objectFilter = url.searchParams.get('object'); // e.g., "project:alpha"
    const typeFilter = url.searchParams.get('type'); // e.g., "project"

    // Read tuples - we need to query by object type since FGA doesn't support listing all tuples
    const tuplesByObject: Record<string, any[]> = {};

    // Objects to query
    const objectsToQuery = objectFilter
      ? [objectFilter]
      : [
          'organization:acme',
          'project:alpha',
          'project:beta',
          'issue:issue-123',
          'issue:issue-456',
        ];

    // Filter by type if specified
    const filteredObjects = typeFilter
      ? objectsToQuery.filter((obj) => obj.startsWith(`${typeFilter}:`))
      : objectsToQuery;

    for (const object of filteredObjects) {
      try {
        const response = await fgaClient.read({ object });
        if (response.tuples && response.tuples.length > 0) {
          tuplesByObject[object] = response.tuples.map((t: any) => ({
            user: t.key.user,
            relation: t.key.relation,
            object: t.key.object,
          }));
        }
      } catch (error) {
        // Object might not have any tuples
        console.log(`No tuples found for ${object}`);
      }
    }

    // Flatten into array
    const allTuples = Object.values(tuplesByObject).flat();

    return NextResponse.json({
      tuples: allTuples,
      count: allTuples.length,
      byObject: tuplesByObject,
    });
  } catch (error) {
    console.error('Error listing tuples:', error);
    return NextResponse.json(
      { error: 'Failed to list tuples' },
      { status: 500 }
    );
  }
});

// POST - Write a new tuple
export const POST = withApiAuthRequired(async function POST(request: Request) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tupleUser, relation, object } = body;

    if (!tupleUser || !relation || !object) {
      return NextResponse.json(
        { error: 'Missing required fields: tupleUser, relation, object' },
        { status: 400 }
      );
    }

    // Validate the tuple format
    if (!tupleUser.includes(':') || !object.includes(':')) {
      return NextResponse.json(
        { error: 'Invalid format. tupleUser and object must be in format "type:id"' },
        { status: 400 }
      );
    }

    try {
      await fgaClient.write({
        writes: [{ user: tupleUser, relation, object }],
      });

      return NextResponse.json({
        success: true,
        tuple: { user: tupleUser, relation, object },
        message: 'Tuple written successfully',
      });
    } catch (fgaError: any) {
      // Check if tuple already exists
      if (fgaError?.message?.includes('already exists')) {
        return NextResponse.json({
          success: false,
          error: 'Tuple already exists',
          tuple: { user: tupleUser, relation, object },
        }, { status: 409 });
      }
      throw fgaError;
    }
  } catch (error: any) {
    console.error('Error writing tuple:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to write tuple' },
      { status: 500 }
    );
  }
});

// DELETE - Remove a tuple
export const DELETE = withApiAuthRequired(async function DELETE(request: Request) {
  try {
    const session = await getSession();
    const user = session?.user;

    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tupleUser, relation, object } = body;

    if (!tupleUser || !relation || !object) {
      return NextResponse.json(
        { error: 'Missing required fields: tupleUser, relation, object' },
        { status: 400 }
      );
    }

    try {
      await fgaClient.write({
        deletes: [{ user: tupleUser, relation, object }],
      });

      return NextResponse.json({
        success: true,
        tuple: { user: tupleUser, relation, object },
        message: 'Tuple deleted successfully',
      });
    } catch (fgaError: any) {
      // Check if tuple doesn't exist
      if (fgaError?.message?.includes('cannot delete')) {
        return NextResponse.json({
          success: false,
          error: 'Tuple does not exist',
          tuple: { user: tupleUser, relation, object },
        }, { status: 404 });
      }
      throw fgaError;
    }
  } catch (error: any) {
    console.error('Error deleting tuple:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete tuple' },
      { status: 500 }
    );
  }
});
