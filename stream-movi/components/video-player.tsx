"use client";
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export default function LiveStream({ playlistUrl }: { playlistUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (Hls.isSupported() && video) {
      const hls = new Hls({
        // Enable live streaming optimizations
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
      });
      hlsRef.current = hls;
      // Load the live playlist
      hls.loadSource(playlistUrl);
      hls.attachMedia(video);
      return () => {
        hls.destroy();
      };
    } else if (video?.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = playlistUrl;
      setIsLive(true);
    } else {
      setError('Live streaming not supported in this browser');
    }
  }, [playlistUrl]);
  const startBroadcast = () => {
    const video = videoRef.current;
    if (video && isLive) {
      video.play();
    }
  };
  const stopBroadcast = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
  };
  return (
    <div className="w-full">
      <div className='mb-2'>
        <span 
        className={`text-sm font-bold ${isLive ? 'text-green-500' : 'text-red-500'}`}>
          {isLive ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>
      {error ? (
        <div className='text-red-500'>Error: {error}</div>
      ) : (
        <video
          ref={videoRef}
          controls
          className='w-full h-auto rounded-lg'
        />
      )}
      <div className='mt-2 flex flex-wrap gap-2'>
        <button onClick={startBroadcast} disabled={!isLive} className='bg-blue-500 text-white px-3 md:px-4 py-2 rounded-md text-sm md:text-base disabled:opacity-50'>
          Start Watching
        </button>
        <button onClick={stopBroadcast} className='bg-red-500 text-white px-3 md:px-4 py-2 rounded-md text-sm md:text-base'>
          Stop
        </button>
      </div>
    </div>
  );
}