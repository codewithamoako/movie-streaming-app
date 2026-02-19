'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { LiveKitSyncManager, PlaybackState, RoomParticipant } from '@/lib/livekit-sync';

interface SynchronizedVideoPlayerProps {
  playlistUrl: string;
  roomName: string;
  userName: string;
  isHost: boolean;
}

// How many seconds of drift we tolerate before forcing a seek
const SEEK_TOLERANCE_SECONDS = 2;
// Debounce delay for sending sync events (ms)
const SYNC_DEBOUNCE_MS = 300;

export default function SynchronizedVideoPlayer({
  playlistUrl,
  roomName,
  userName,
  isHost,
}: SynchronizedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const syncManagerRef = useRef<LiveKitSyncManager | null>(null);

  // Flags to prevent sync loops
  const isApplyingRemoteState = useRef(false);
  const syncDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // UI state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'idle'>('idle');

  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Get the current playback state snapshot for broadcasting */
  const getPlaybackSnapshot = useCallback((): PlaybackState => {
    const video = videoRef.current;
    return {
      isPlaying: video ? !video.paused : false,
      currentTime: video?.currentTime ?? 0,
      timestamp: Date.now(),
    };
  }, []);

  /** Broadcast current state with debounce to avoid flooding */
  const broadcastState = useCallback(
    (overrides?: Partial<PlaybackState>) => {
      if (syncDebounceTimer.current) clearTimeout(syncDebounceTimer.current);
      syncDebounceTimer.current = setTimeout(() => {
        if (!syncManagerRef.current?.isConnected()) return;
        const state: PlaybackState = { ...getPlaybackSnapshot(), ...overrides };
        syncManagerRef.current.sendPlaybackState(state);
        setSyncStatus('synced');
      }, SYNC_DEBOUNCE_MS);
    },
    [getPlaybackSnapshot]
  );

  /** Apply a remote playback state to the local video element */
  const applyRemoteState = useCallback((state: PlaybackState) => {
    const video = videoRef.current;
    if (!video) return;

    // Mark that we are applying a remote state so our own event handlers don't re-broadcast
    isApplyingRemoteState.current = true;
    setSyncStatus('syncing');

    // Latency compensation: adjust currentTime by elapsed time since the message was sent
    const latencySeconds = (Date.now() - state.timestamp) / 1000;
    const targetTime = state.currentTime + (state.isPlaying ? latencySeconds : 0);

    // Only seek if drift exceeds tolerance
    const drift = Math.abs(video.currentTime - targetTime);
    if (drift > SEEK_TOLERANCE_SECONDS) {
      video.currentTime = targetTime;
    }

    if (state.isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!state.isPlaying && !video.paused) {
      video.pause();
    }

    // Release the flag after a short delay to let events settle
    setTimeout(() => {
      isApplyingRemoteState.current = false;
      setSyncStatus('synced');
    }, 500);
  }, []);

  // ─── HLS Setup ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });
      hlsRef.current = hls;
      hls.loadSource(playlistUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Don't auto-play; wait for sync
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error('[HLS] Fatal error:', data);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = playlistUrl;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [playlistUrl]);

  // ─── Video Event Listeners ───────────────────────────────────────────────────

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      if (!isApplyingRemoteState.current) {
        broadcastState({ isPlaying: true });
      }
    };

    const onPause = () => {
      setIsPlaying(false);
      if (!isApplyingRemoteState.current) {
        broadcastState({ isPlaying: false });
      }
    };

    const onSeeked = () => {
      if (!isApplyingRemoteState.current) {
        broadcastState();
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Update buffered amount
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };

    const onDurationChange = () => {
      setDuration(video.duration || 0);
    };

    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('volumechange', onVolumeChange);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('volumechange', onVolumeChange);
    };
  }, [broadcastState]);

  // ─── LiveKit Connection ──────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const initSync = async () => {
      try {
        setIsConnecting(true);
        setConnectionError(null);

        // Fetch token from our API
        const res = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName,
            participantName: userName,
            isHost,
          }),
        });

        if (!res.ok) throw new Error('Failed to get LiveKit token');
        const { token } = await res.json();

        if (cancelled) return;

        const manager = new LiveKitSyncManager(
          roomName,
          userName,
          isHost ? 'host' : 'viewer',
          {
            onPlaybackStateChange: (state) => {
              applyRemoteState(state);
            },
            onParticipantChange: (p) => {
              setParticipants(p);
            },
            onConnectionChange: (connected) => {
              setIsConnected(connected);
              setIsConnecting(!connected);
            },
            onError: (err) => {
              console.error('[LiveKit] Error:', err);
              setConnectionError(err.message);
              setIsConnecting(false);
            },
            // When a viewer requests sync, we respond with current state
            onSyncRequest: () => {
              return getPlaybackSnapshot();
            },
          }
        );

        syncManagerRef.current = manager;
        await manager.connect(token);
        setIsConnecting(false);
      } catch (err: any) {
        if (!cancelled) {
          console.error('[SyncPlayer] Connection error:', err);
          setConnectionError(err.message || 'Connection failed');
          setIsConnecting(false);
        }
      }
    };

    initSync();

    return () => {
      cancelled = true;
      syncManagerRef.current?.disconnect();
      syncManagerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, userName, isHost]);

  // ─── Fullscreen Listener ─────────────────────────────────────────────────────

  useEffect(() => {
    const handleFullscreenChange = () => {
      // Check both standard and webkit fullscreen
      const isFullscreen = !!document.fullscreenElement || !!((document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement);
      setIsFullscreen(isFullscreen);
    };
    
    // Standard fullscreen API
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    // iOS Safari webkit fullscreen
    document.addEventListener('webkitbeginfullscreen', handleFullscreenChange);
    document.addEventListener('webkitendfullscreen', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitbeginfullscreen', handleFullscreenChange);
      document.removeEventListener('webkitendfullscreen', handleFullscreenChange);
    };
  }, []);

  // ─── Controls Auto-hide ──────────────────────────────────────────────────────

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (!isSeeking) setShowControls(false);
    }, 3000);
  }, [isSeeking]);

  // ─── Control Handlers ────────────────────────────────────────────────────────

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const video = videoRef.current;
      if (!video) return;
      const newTime = parseFloat(e.target.value);
      video.currentTime = newTime;
      setCurrentTime(newTime);
    },
    []
  );

  const handleSeekStart = useCallback(() => {
    setIsSeeking(true);
  }, []);

  const handleSeekEnd = useCallback(() => {
    setIsSeeking(false);
    broadcastState();
  }, [broadcastState]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const video = videoRef.current;
      if (!video) return;
      const newVolume = parseFloat(e.target.value);
      video.volume = newVolume;
      video.muted = newVolume === 0;
    },
    []
  );

  const handleMuteToggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const handleFullscreen = useCallback(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!container && !video) return;

    // iOS Safari uses webkit specific fullscreen on the video element
    if (video) {
      const webkitVideo = video as HTMLVideoElement & {
        webkitEnterFullscreen?: () => void;
        webkitExitFullscreen?: () => void;
      };
      if (webkitVideo.webkitEnterFullscreen) {
        const webkitDoc = document as Document & {
          webkitFullscreenElement?: Element;
        };
        if (webkitDoc.webkitFullscreenElement) {
          webkitVideo.webkitExitFullscreen?.();
        } else {
          webkitVideo.webkitEnterFullscreen();
        }
        return;
      }
    }

    // Standard fullscreen API for other browsers
    if (!document.fullscreenElement) {
      container?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // ─── Formatting ──────────────────────────────────────────────────────────────

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-xl overflow-hidden select-none"
      style={{ aspectRatio: '16/9' }}
      onMouseMove={resetControlsTimer}
      onMouseEnter={resetControlsTimer}
      onMouseLeave={() => {
        if (!isSeeking) setShowControls(false);
      }}
      onTouchStart={resetControlsTimer}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onClick={handlePlayPause}
        playsInline
      />

      {/* Connection Overlay */}
      {(isConnecting || connectionError) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20">
          {isConnecting && !connectionError && (
            <>
              <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3" />
              <p className="text-white text-sm font-medium">Connecting to room…</p>
            </>
          )}
          {connectionError && (
            <>
              <svg className="w-10 h-10 text-red-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-white text-sm font-medium mb-1">Connection failed</p>
              <p className="text-white/60 text-xs max-w-xs text-center">{connectionError}</p>
            </>
          )}
        </div>
      )}

      {/* Top Bar: Room info */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        <div className="flex items-center gap-2">
          {/* Role badge */}
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: isHost ? 'rgba(239,68,68,0.85)' : 'rgba(59,130,246,0.85)',
              color: 'white',
            }}
          >
            {isHost ? '👑 Host' : '👁 Viewer'}
          </span>

          {/* Connection status */}
          <span className="flex items-center gap-1 text-xs text-white/80">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: isConnected ? '#22c55e' : '#ef4444' }}
            />
            {isConnected ? 'Live' : 'Offline'}
          </span>

          {/* Sync status */}
          {syncStatus === 'syncing' && (
            <span className="text-xs text-yellow-300 animate-pulse">⟳ Syncing…</span>
          )}
        </div>

        {/* Participant count */}
        <div className="flex items-center gap-1 text-xs text-white/80">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {participants.length}
        </div>
      </div>

      {/* Center Play/Pause indicator (flash on click) */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        onClick={handlePlayPause}
        style={{ pointerEvents: 'none' }}
      >
        {/* Invisible click target handled by video element */}
      </div>

      {/* Bottom Controls */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8 z-10 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        {/* Progress / Seek Bar */}
        <div className="relative w-full h-5 flex items-center mb-2 group cursor-pointer">
          {/* Track background */}
          <div className="absolute w-full h-1 rounded-full bg-white/20 group-hover:h-1.5 transition-all" />
          {/* Buffered */}
          <div
            className="absolute h-1 rounded-full bg-white/40 group-hover:h-1.5 transition-all"
            style={{ width: `${bufferedPercent}%` }}
          />
          {/* Played */}
          <div
            className="absolute h-1 rounded-full group-hover:h-1.5 transition-all"
            style={{ width: `${progressPercent}%`, backgroundColor: '#ef4444' }}
          />
          {/* Thumb */}
          <div
            className="absolute w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercent}% - 6px)` }}
          />
          {/* Range input (invisible, on top) */}
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            onMouseDown={handleSeekStart}
            onMouseUp={handleSeekEnd}
            onTouchStart={handleSeekStart}
            onTouchEnd={handleSeekEnd}
            className="absolute w-full h-full opacity-0 cursor-pointer"
            style={{ zIndex: 1 }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-3">
          {/* Play / Pause */}
          <button
            onClick={handlePlayPause}
            className="text-white hover:text-white/80 transition-colors flex-shrink-0"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1.5 group/vol">
            <button
              onClick={handleMuteToggle}
              className="text-white hover:text-white/80 transition-colors flex-shrink-0"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : volume < 0.5 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-0 group-hover/vol:w-20 transition-all duration-200 cursor-pointer accent-white"
              style={{ height: '4px' }}
            />
          </div>

          {/* Time */}
          <span className="text-white text-xs font-mono flex-shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Participants list (tooltip) */}
          {participants.length > 0 && (
            <div className="relative group/participants">
              <button className="text-white/70 hover:text-white text-xs flex items-center gap-1 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {participants.length}
              </button>
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover/participants:block bg-black/90 rounded-lg p-2 min-w-[140px] text-xs text-white shadow-xl border border-white/10">
                {participants.map((p) => (
                  <div key={p.identity} className="flex items-center gap-2 py-1">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.role === 'host' ? '#ef4444' : '#3b82f6' }}
                    />
                    <span className="truncate">{p.name}</span>
                    <span className="text-white/40 ml-auto">{p.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fullscreen */}
          <button
            onClick={handleFullscreen}
            className="text-white hover:text-white/80 transition-colors flex-shrink-0"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
