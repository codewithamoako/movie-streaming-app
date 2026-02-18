'use client';
import SynchronizedVideoPlayer from "@/components/synchronized-video-player";
import { useSearchParams, useParams } from "next/navigation";
import { Suspense } from "react";

function RoomContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const roomId = params.id as string;
  const isHost = searchParams.get("host") === "true";
  const userName = searchParams.get("user") || 'Guest';

  return (
    <div className="flex flex-col justify-center items-center min-h-screen p-3 md:p-4">
      <h1 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-center">
        {isHost ? "🎬 Host Control Room" : "👀 Viewer Room"}
      </h1>
      <div className="w-full max-w-4xl">
        <SynchronizedVideoPlayer 
          playlistUrl="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
          roomName={roomId}
          userName={userName}
          isHost={isHost}
        />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
      <RoomContent />
    </Suspense>
  );
}
