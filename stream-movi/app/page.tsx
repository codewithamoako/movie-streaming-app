'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isHost, setIsHost] = useState(false);

  const handleJoin = () => {
    const room = roomId || Math.random().toString(36).substring(7);
    const name = userName || `User-${Math.random().toString(36).substring(7)}`;
    router.push(`/room/${room}?host=${isHost}&user=${encodeURIComponent(name)}`);
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen gap-6 p-4">
      <h1 className="text-4xl font-bold">🎬 Movie Streaming App</h1>
      <p className="text-gray-600">Watch movies together in real-time</p>
      
      <div className="flex flex-col gap-4 w-full max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">Your Name</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Room ID (optional)</label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Leave empty for random room"
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isHost"
            checked={isHost}
            onChange={(e) => setIsHost(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="isHost" className="text-sm">
            I want to control playback (be the host)
          </label>
        </div>

        <button
          onClick={handleJoin}
          className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-600"
        >
          {isHost ? '🎬 Start Watching (as Host)' : '👀 Join as Viewer'}
        </button>
      </div>

      <div className="text-sm text-gray-500 mt-4">
        <p>As a host, you can control playback (play/pause/seek)</p>
        <p>Viewers will be synchronized with the host</p>
      </div>
    </div>
  );
}
