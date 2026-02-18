# Movie Streaming App with Real-Time Synchronization

A Next.js application that allows multiple users to watch videos together in real-time synchronization.

## Features

- **Real-Time Synchronization**: All viewers see the same content at the same moment
- **Host/Viewer Roles**: Host controls playback, viewers follow
- **Live Streaming**: HLS-based live video streaming
- **Room-Based**: Create rooms and share with friends

## How It Works

### Architecture
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Host      │────▶│  LiveKit     │◀────│  Viewer 1   │
│  (control)  │     │   Server     │     │  (sync)     │
└─────────────┘     └──────────────┘     └─────────────┘
                                                │
                                                ▼
                                         ┌─────────────┐
                                         │  Viewer 2   │
                                         │  (sync)     │
                                         └─────────────┘
```

### Synchronization Flow
1. **Host** connects to LiveKit room with host permissions
2. **Viewers** connect to the same room with viewer permissions
3. When host plays/pauses/seeks, the playback state is broadcast to all viewers
4. Viewers automatically sync their video to match the host's playback state

## Setup

### 1. Install Dependencies
```bash
cd stream-movi
npm install
```

### 2. Configure LiveKit
Create a `.env.local` file with your LiveKit credentials:

```env
# Option A: Local development
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# Option B: LiveKit Cloud (recommended for production)
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
```

### 3. Start LiveKit Server (Development)
```bash
# Using Docker
docker run -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  -e LIVEKIT_KEYS="your_api_key:your_api_secret" \
  livekit/livekit-server

# Or use LiveKit CLI
npx livekit-server --dev
```

### 4. Run the Application
```bash
npm run dev
```

## Usage

### As a Host
1. Open the app at `http://localhost:3000`
2. Enter your name
3. Check "I want to control playback"
4. Click "Start Watching (as Host)"
5. Use Play/Pause/Seek controls to control the video
6. Share the Room ID with viewers

### As a Viewer
1. Open the app at `http://localhost:3000`
2. Enter your name
3. Enter the Room ID from the host
4. Click "Join as Viewer"
5. Your playback will automatically sync with the host

## API Routes

### `POST /api/livekit-token`
Generates a LiveKit access token for room participation.

**Request Body:**
```json
{
  "roomName": "room-123",
  "participantName": "John",
  "isHost": true
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUz..."
}
```

## Key Files

| File | Description |
|------|-------------|
| [`lib/livekit-sync.ts`](stream-movi/lib/livekit-sync.ts) | LiveKit sync manager class |
| [`components/synchronized-video-player.tsx`](stream-movi/components/synchronized-video-player.tsx) | Video player with sync |
| [`app/api/livekit-token/route.ts`](stream-movi/app/api/livekit-token/route.ts) | Token generation API |
| [`app/room/[id]/page.tsx`](stream-movi/app/room/[id]/page.tsx) | Room page |
| [`app/page.tsx`](stream-movi/app/page.tsx) | Home page with join form |

## Production Deployment

For production, consider:
1. Use **LiveKit Cloud** for scalable WebRTC infrastructure
2. Deploy to **Vercel** or similar platform
3. Use **HTTPS** (required for WebRTC)
4. Set up proper environment variables in your deployment platform
