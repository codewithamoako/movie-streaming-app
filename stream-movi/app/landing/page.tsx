"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/ui/navbar";
import Popup from "./popup";

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

export default function Landing() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  // Handle join param from URL
  useEffect(() => {
    const joinCode = searchParams.get("join");
    if (joinCode) {
      setRoomCode(joinCode);
    }
  }, [searchParams]);

  const handleNewSync = () => {
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  const handleJoin = () => {
    if (roomCode.trim()) {
      const account = getAccount();
      const name = account?.userName || "Guest";
      router.push(
        `/room/${roomCode.trim()}?host=false&user=${encodeURIComponent(name)}`
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJoin();
    }
  };

  return (
    <>
      <Navbar />

      <div className="flex flex-col justify-center items-center min-h-[95vh] md:min-h-[50svh] px-4">
        <div className="flex flex-col justify-center items-center w-full max-w-2xl">

          {/* Text Section */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl text-center mb-4 font-light">
            Stream movies together
          </h1>
          <p className="text-base md:text-xl text-center font-light mb-6 md:mb-8 text-gray-300">
            In sync, anywhere, anytime{" "}
            <span className="font-bold text-blue-600">Kalotare</span> makes
            movie nights easy.
          </p>

          {/* Join Controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={handleNewSync}
              className="bg-blue-600 text-white px-6 md:px-8 py-3 rounded-full font-light hover:bg-blue-700 transition-colors whitespace-nowrap flex gap-2 items-center justify-center"
            >
              <i className="fi fi-rr-video-plus flex  text-xl "></i>
              New Room
            </button>

            <div
              className="w-full flex items-center border rounded-sm focus:outline-none focus:ring-2 relative"
              style={{
                borderColor: "var(--border-subtle)",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--border-strong)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--border-subtle)")
              }
            >
              <i className="fi fi-rr-keyboard flex text-2xl absolute left-3 "></i>

              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="w-full h-full pl-12 py-4"
                onKeyDown={handleKeyPress}
                placeholder="Enter a code"
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={!roomCode.trim()}
              className=" text-white px-4 md:px-6 rounded-xl font-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Join
            </button>
          </div>
          {/* <hr className="w-full border-t border-gray-700 my-6 md:my-10" /> */}
        </div>
      </div>

      {/* Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 bg-[#00000080] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg py-5 max-w-lg w-full mx-12 relative">
            <button
              onClick={handleClosePopup}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <Popup />
          </div>
        </div>
      )}
    </>
  );
}
