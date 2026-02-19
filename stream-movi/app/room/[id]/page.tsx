"use client";
import SynchronizedVideoPlayer from "@/components/synchronized-video-player";
import { useSearchParams, useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Navbar from "@/components/ui/navbar";
import { useCallback } from "react";

const STORAGE_KEY = "movieStreamingAccount";

interface MovieStreamingAccount {
  userName: string;
  email: string;
  password: string;
  createdAt: string;
}

function getAccount(): MovieStreamingAccount | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as MovieStreamingAccount;
  } catch {
    return null;
  }
}

function getUserName(): string {
  const account = getAccount();
  return account?.userName || "Guest";
}

function RoomContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const roomId = params.id as string;
  const isHost = searchParams.get("host") === "true";
  const [copied, setCopied] = useState(false);
  
  // Get username from URL query param first, then fall back to localStorage
  const urlUserName = searchParams.get("user");
  const [userName, setUserName] = useState(urlUserName || "Guest");

  useEffect(() => {
    // If no username from URL, try localStorage
    if (!urlUserName) {
      setUserName(getUserName());
    }
  }, [urlUserName]);

  // Copy room code to clipboard
  const copyRoomCode = useCallback(() => {
    const joinUrl = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomId]);

  return (
    <div className="flex flex-col justify-center items-center min-h-[80vh] p-3 md:p-4">
      {/* Room Code Display for Host */}

      
      <div className="w-full max-w-4xl">
        <SynchronizedVideoPlayer
          playlistUrl="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
          roomName={roomId}
          userName={userName}
          isHost={isHost}
        />
      </div>
            {isHost && (
        <div className="w-full max-w-4xl mt-6">
          <div className="bg-gradient-to-r from-black-600 to-black-800 rounded-lg p-2 shadow-lg">
            <div className="text-center">
              <p className="text-white/80 text-sm mb-1">Share this code with friends to join:</p>
              <div className="flex items-center justify-center gap-2">
                <code className="bg-black/30 px-4 py-2 rounded-lg text-white font-mono text-lg font-bold">
                  {roomId}
                </code>
                <button
                  onClick={copyRoomCode}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1 text-sm"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Link
                    </>
                  )}
                </button>
              </div>
              <p className="text-white/60 text-xs mt-2">Or share this URL directly</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">
          Loading...
        </div>
      }
    >
      <Navbar />

      <RoomContent />
    </Suspense>
  );
}
