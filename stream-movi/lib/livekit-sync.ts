import {
  Room,
  RoomEvent,
  ConnectionState,
} from 'livekit-client';

// Types for synchronization
export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  timestamp: number; // Server timestamp for latency compensation
  videoUrl?: string;
}

export interface SyncMessage {
  type: 'playback_state' | 'user_joined' | 'user_left' | 'sync_request' | 'sync_response' | 'emoji_reaction';
  payload: any;
  senderId: string;
  senderName: string;
}

export type EmojiType = 'heart' | 'sad' | 'funny' | 'scared';

export interface EmojiReaction {
  emoji: EmojiType;
  senderId: string;
  senderName: string;
  timestamp: number;
}

export type UserRole = 'host' | 'viewer';

export interface RoomParticipant {
  identity: string;
  name: string;
  role: UserRole;
  joinedAt: Date;
}

// LiveKit configuration
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';

// Debug logging for environment variables
console.log('[LiveKitSync] Environment check:');
console.log('[LiveKitSync] NEXT_PUBLIC_LIVEKIT_URL:', process.env.NEXT_PUBLIC_LIVEKIT_URL);
console.log('[LiveKitSync] LIVEKIT_URL (server only):', process.env.LIVEKIT_URL);
console.log('[LiveKitSync] Using URL:', LIVEKIT_URL);

export class LiveKitSyncManager {
  private room: Room | null = null;
  private participantName: string;
  private role: UserRole;
  private roomName: string;
  private onPlaybackStateChange?: (state: PlaybackState) => void;
  private onParticipantChange?: (participants: RoomParticipant[]) => void;
  private onConnectionChange?: (connected: boolean) => void;
  private onError?: (error: Error) => void;
  private onSyncRequest?: () => PlaybackState | null;
  private onEmojiReaction?: (reaction: EmojiReaction) => void;

  constructor(
    roomName: string,
    participantName: string,
    role: UserRole,
    callbacks: {
      onPlaybackStateChange?: (state: PlaybackState) => void;
      onParticipantChange?: (participants: RoomParticipant[]) => void;
      onConnectionChange?: (connected: boolean) => void;
      onError?: (error: Error) => void;
      onSyncRequest?: () => PlaybackState | null;
      onEmojiReaction?: (reaction: EmojiReaction) => void;
    }
  ) {
    this.roomName = roomName;
    this.participantName = participantName;
    this.role = role;
    this.onPlaybackStateChange = callbacks.onPlaybackStateChange;
    this.onParticipantChange = callbacks.onParticipantChange;
    this.onConnectionChange = callbacks.onConnectionChange;
    this.onError = callbacks.onError;
    this.onSyncRequest = callbacks.onSyncRequest;
    this.onEmojiReaction = callbacks.onEmojiReaction;
  }

  async connect(token: string): Promise<void> {
    try {
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event listeners
      this.room
        .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          console.log('[LiveKit] Connection state changed:', state);
          this.onConnectionChange?.(state === ConnectionState.Connected);
        })
        .on(RoomEvent.ParticipantConnected, () => {
          this.notifyParticipantChange();
        })
        .on(RoomEvent.ParticipantDisconnected, () => {
          this.notifyParticipantChange();
        })
        .on(RoomEvent.DataReceived, (payload: any) => {
          console.log('[LiveKit] DataReceived event triggered');
          this.handleDataReceived(payload);
        });

      await this.room.connect(LIVEKIT_URL, token);
      
      // Send join notification
      this.broadcastMessage({
        type: 'user_joined',
        payload: { name: this.participantName, role: this.role },
        senderId: this.room.localParticipant.identity,
        senderName: this.participantName,
      });

      // Request current state from host
      if (this.role === 'viewer') {
        this.broadcastMessage({
          type: 'sync_request',
          payload: {},
          senderId: this.room.localParticipant.identity,
          senderName: this.participantName,
        });
      }

      await this.notifyParticipantChange();
    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    }
  }

  private handleDataReceived(payload: any): void {
    try {
      // Handle different payload formats
      let data: Uint8Array;
      if (payload instanceof Uint8Array) {
        data = payload;
      } else if (typeof payload === 'string') {
        data = new TextEncoder().encode(payload);
      } else if (payload.data instanceof Uint8Array) {
        data = payload.data;
      } else {
        return;
      }

      const message: SyncMessage = JSON.parse(new TextDecoder().decode(data));
      
      // Ignore own messages
      if (message.senderId === this.room?.localParticipant.identity) {
        console.log('[LiveKit] Ignoring own message');
        return;
      }

      console.log('[LiveKit] Received message from:', message.senderName, 'type:', message.type);

      switch (message.type) {
        case 'playback_state':
          console.log('[LiveKit] Received playback state from:', message.senderName, message.payload);
          // All participants sync their playback to the latest state
          this.onPlaybackStateChange?.(message.payload);
          break;
        case 'sync_response':
          console.log('[LiveKit] Received sync response from:', message.senderName, message.payload);
          // Apply the sync response as a playback state update
          this.onPlaybackStateChange?.(message.payload);
          break;
        case 'user_joined':
        case 'user_left':
          this.notifyParticipantChange();
          break;
        case 'sync_request':
          console.log('[LiveKit] Received sync request from:', message.senderName);
          // Any participant (especially host) responds with current state
          if (this.onSyncRequest) {
            const currentState = this.onSyncRequest();
            if (currentState) {
              this.broadcastMessage({
                type: 'sync_response',
                payload: {
                  ...currentState,
                  timestamp: Date.now(),
                },
                senderId: this.room?.localParticipant.identity || '',
                senderName: this.participantName,
              });
            }
          }
          break;
        case 'emoji_reaction':
          console.log('[LiveKit] Received emoji reaction from:', message.senderName, message.payload);
          this.onEmojiReaction?.(message.payload);
          break;
      }
    } catch (error) {
      console.error('Error handling data received:', error);
    }
  }

  sendPlaybackState(state: PlaybackState): void {
    // All participants can send playback state
    console.log('[LiveKit] Sending playback state:', state);
    console.log('[LiveKit] Room exists:', !!this.room);
    console.log('[LiveKit] Local participant:', this.room?.localParticipant?.identity);
    
    this.broadcastMessage({
      type: 'playback_state',
      payload: {
        ...state,
        senderId: this.room?.localParticipant?.identity,
      },
      senderId: this.room?.localParticipant.identity || '',
      senderName: this.participantName,
    });
  }

  sendEmojiReaction(emoji: EmojiType): void {
    console.log('[LiveKit] Sending emoji reaction:', emoji);
    this.broadcastMessage({
      type: 'emoji_reaction',
      payload: {
        emoji,
        senderId: this.room?.localParticipant?.identity,
        senderName: this.participantName,
        timestamp: Date.now(),
      },
      senderId: this.room?.localParticipant.identity || '',
      senderName: this.participantName,
    });
  }

  private broadcastMessage(message: SyncMessage): void {
    if (!this.room) {
      console.log('[LiveKit] broadcastMessage: room is null');
      return;
    }

    if (this.room.state !== ConnectionState.Connected) {
      console.log('[LiveKit] broadcastMessage: room not connected, state:', this.room.state);
      return;
    }

    console.log('[LiveKit] Broadcasting message:', message.type);
    const data = new TextEncoder().encode(JSON.stringify(message));
    // Use the correct method for publishing data
    this.room.localParticipant.publishData(data);
    console.log('[LiveKit] Data published successfully');
  }

  private async notifyParticipantChange(): Promise<void> {
    if (!this.room) return;

    const participants: RoomParticipant[] = [];
    
    // Get remote participants using remoteParticipants property
    this.room.remoteParticipants.forEach((p: any) => {
      participants.push({
        identity: p.identity,
        name: p.name || p.identity,
        role: 'viewer' as UserRole,
        joinedAt: p.joinedAt || new Date(),
      });
    });

    // Add local participant
    if (this.room.localParticipant) {
      participants.unshift({
        identity: this.room.localParticipant.identity,
        name: this.room.localParticipant.name || this.participantName,
        role: this.role,
        joinedAt: this.room.localParticipant.joinedAt || new Date(),
      });
    }

    this.onParticipantChange?.(participants);
  }

  getParticipants(): RoomParticipant[] {
    if (!this.room) return [];

    const participants: RoomParticipant[] = [];
    
    // Get remote participants
    this.room.remoteParticipants.forEach((p: any) => {
      participants.push({
        identity: p.identity,
        name: p.name || p.identity,
        role: 'viewer' as UserRole,
        joinedAt: p.joinedAt || new Date(),
      });
    });

    // Add local participant
    if (this.room.localParticipant) {
      participants.unshift({
        identity: this.room.localParticipant.identity,
        name: this.room.localParticipant.name || this.participantName,
        role: this.role,
        joinedAt: this.room.localParticipant.joinedAt || new Date(),
      });
    }

    return participants;
  }

  async disconnect(): Promise<void> {
    if (!this.room) return;

    // Send leave notification
    this.broadcastMessage({
      type: 'user_left',
      payload: { name: this.participantName },
      senderId: this.room.localParticipant.identity,
      senderName: this.participantName,
    });

    await this.room.disconnect();
    this.room = null;
  }

  isConnected(): boolean {
    return this.room?.state === ConnectionState.Connected;
  }

  getLocalParticipantId(): string | undefined {
    return this.room?.localParticipant?.identity;
  }
}
