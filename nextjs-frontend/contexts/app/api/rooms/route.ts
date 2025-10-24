import { NextRequest, NextResponse } from 'next/server';

// In-memory store for rooms (in production, use a database)
const rooms = new Map<string, any>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('id');

    if (roomId) {
      const room = rooms.get(roomId);
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      return NextResponse.json(room);
    }

    // Return all rooms
    return NextResponse.json(Array.from(rooms.entries()).map(([id, data]) => ({ id, ...data })));
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, hostEmail, participants = [] } = body;

    if (!roomId || !hostEmail) {
      return NextResponse.json(
        { error: 'roomId and hostEmail are required' },
        { status: 400 }
      );
    }

    const room = {
      roomId,
      hostEmail,
      participants: [hostEmail, ...participants],
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    rooms.set(roomId, room);

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('id');

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    }

    if (!rooms.has(roomId)) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    rooms.delete(roomId);

    return NextResponse.json({ message: 'Room deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
