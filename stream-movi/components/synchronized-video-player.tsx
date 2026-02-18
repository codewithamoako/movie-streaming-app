"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { LiveKitSyncManager, PlaybackState, RoomParticipant } from '@/lib/livekit-sync';

interface SynchronizedVideoPlayerProps {
  playlistUrl: string;
  roomName: string;
  userName: string;
  isHost: boolean;
}

export default function SynchronizedVideoPlayer({
  playlistUrl,
  roomName,
  userName,
  isHost,
}: SynchronizedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const syncManagerRef = useRef<LiveKitSyncManager | null>(null);
  const isSyncingRef = useRef(false);

  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    timestamp: 0,
  });

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (Hls.isSupported() && video) {
      const hls = new Hls({
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
      });
      hlsRef.current = hls;
      hls.loadSource(playlistUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLive(true);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError('Failed to load video stream');
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video?.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playlistUrl;
      setIsLive(true);
    } else {
      setError('Live streaming not supported in this browser');
    }
  }, [playlistUrl]);

  // Initialize LiveKit connection
  useEffect(() => {
    const initLiveKit = async () => {
      try {
        // Get token from API
        const response = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName,
            participantName: userName,
            isHost,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get token');
        }

        const { token } = await response.json();

        const syncManager = new LiveKitSyncManager(
          roomName,
          userName,
          isHost ? 'host' : 'viewer',
          {
            onPlaybackStateChange: (state) => {
              handlePlaybackStateChange(state);
            },
            onParticipantChange: (parts) => {
              setParticipants(parts);
            },
            onConnectionChange: (connected) => {
              setIsConnected(connected);
            },
            onError: (err) => {
              console.error('LiveKit error:', err);
              setError(err.message);
            },
          }
        );

        await syncManager.connect(token);
        syncManagerRef.current = syncManager;
      } catch (err) {
        console.error('Failed to connect to LiveKit:', err);
        const error = err as Error;
        if (error.message?.includes('connect') || error.message?.includes('network') || error.message?.includes('WebSocket')) {
          setError('Failed to connect to synchronization server. Please check your LiveKit configuration in .env.local');
        } else if (error.message?.includes('token')) {
          setError('Failed to authenticate with synchronization server. Please check your API credentials');
        } else {
          setError(error.message || 'Failed to connect to synchronization server');
        }
      }
    };

    initLiveKit();

    return () => {
      syncManagerRef.current?.disconnect();
    };
  }, [roomName, userName, isHost]);

  // Handle playback state changes from host
  const handlePlaybackStateChange = useCallback((state: PlaybackState) => {
    const video = videoRef.current;
    if (!video || isSyncingRef.current) return;

    isSyncingRef.current = true;

    const currentTime = video.currentTime;
    const timeDiff = Math.abs(currentTime - state.currentTime);

    // Only sync if time difference is more than 1 second
    if (timeDiff > 1) {
      video.currentTime = state.currentTime;
    }

    if (state.isPlaying && video.paused) {
      video.play().catch(console.error);
    } else if (!state.isPlaying && !video.paused) {
      video.pause();
    }

    setTimeout(() => {
      isSyncingRef.current = false;
    }, 100);
  }, []);

  // Broadcast playback changes (host only)
  const broadcastPlaybackState = useCallback(() => {
    const video = videoRef.current;
    if (!video || !syncManagerRef.current || !isHost) return;

    const state: PlaybackState = {
      isPlaying: !video.paused,
      currentTime: video.currentTime,
      timestamp: Date.now(),
      videoUrl: playlistUrl,
    };

    syncManagerRef.current.sendPlaybackState(state);
    setPlaybackState(state);
  }, [isHost, playlistUrl]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      if (isHost && !isSyncingRef.current) {
        broadcastPlaybackState();
      }
    };

    const handlePause = () => {
      if (isHost && !isSyncingRef.current) {
        broadcastPlaybackState();
      }
    };

    const handleSeeked = () => {
      if (isHost && !isSyncingRef.current) {
        broadcastPlaybackState();
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [isHost, broadcastPlaybackState]);

  const handleStartBroadcast = () => {
    const video = videoRef.current;
    if (video) {
      video.play();
    }
  };

  const handleStopBroadcast = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video && isHost) {
      video.currentTime = parseFloat(e.target.value);
      broadcastPlaybackState();
    }
  };

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {/* Status bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-sm font-bold ${
              isLive ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {isLive ? 'LIVE' : 'OFFLINE'}
          </span>
          <span
            className={`text-sm font-bold ${
              isConnected ? 'text-blue-500' : 'text-yellow-500'
            }`}
          >
            {isConnected ? 'SYNCED' : 'CONNECTING...'}
          </span>
          {isHost && (
            <span className="text-sm font-bold text-purple-500">HOST</span>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {participants.length} participant{participants.length !== 1 ? 's' : ''} watching
        </div>
      </div>

      {/* Participants list */}
      {participants.length > 0 && (
        <div className="text-sm text-gray-400 hidden md:block">
          Watching: {participants.map((p) => p.name).join(', ')}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="text-red-500 text-sm">Error: {error}</div>
      )}

      {/* Video player */}
      {error && !isLive ? (
        <div className="text-red-500">Error loading video</div>
      ) : (
        <video
          ref={videoRef}
          controls
          className="w-full h-auto"
          playsInline
        />
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        {isHost ? (
          <>
            <button
              onClick={handleStartBroadcast}
              disabled={!isLive}
              className="bg-blue-500 text-white px-3 md:px-4 py-2 rounded-md disabled:opacity-50 text-sm md:text-base"
            >
              Play
            </button>
            <button
              onClick={handleStopBroadcast}
              className="bg-red-500 text-white px-3 md:px-4 py-2 rounded-md text-sm md:text-base"
            >
              Pause
            </button>
            <input
              type="range"
              min="0"
              max={videoRef.current?.duration || 100}
              value={videoRef.current?.currentTime || 0}
              onChange={handleSeek}
              className="flex-1 min-w-[100px]"
              disabled={!isLive}
            />
          </>
        ) : (
          <div className="text-sm text-gray-500">
            {playbackState.isPlaying ? '▶ Playing' : '⏸ Paused'}
            <span className="ml-2">
              {Math.floor(playbackState.currentTime)}s
            </span>
          </div>
        )}
      </div>

      {/* Info for viewers */}
      {!isHost && isConnected && (
        <div className="text-sm text-gray-500 mt-2">
          Your playback is synchronized with the host
        </div>
      )}
    </div>
  );
}
