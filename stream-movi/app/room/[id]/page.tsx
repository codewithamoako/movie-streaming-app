'use client';
import SynchronizedVideoPlayer from "@/components/synchronized-video-player";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function RoomContent() {
  const searchParams = useSearchParams();
  const isHost = searchParams.get("host") === "true";
  const userName = searchParams.get("user") || `User-${Math.random().toString(36).substring(7)}`;

  return (
    <div className="flex flex-col justify-center items-center h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">
        {isHost ? "🎬 Host Control Room" : "👀 Viewer Room"}
      </h1>
      <div className="w-full max-w-4xl">
        <SynchronizedVideoPlayer 
          playlistUrl="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
          roomName={`room-${Math.random().toString(36).substring(7)}`}
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
