import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

// These would typically be environment variables
const API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomName, participantName, isHost } = body;

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: 'Missing required fields: roomName, participantName' },
        { status: 400 }
      );
    }

    // Create access token
    const at = new AccessToken(API_KEY, API_SECRET, {
      identity: participantName,
      name: participantName,
    });

    // Grant permissions - all participants can control playback
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
