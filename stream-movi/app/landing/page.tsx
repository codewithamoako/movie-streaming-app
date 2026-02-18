"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/ui/navbar";

export default function Landing() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");

  const handleNewSync = () => {
    const roomId = Math.random().toString(36).substring(7);
    const name = `User-${Math.random().toString(36).substring(7)}`;
    router.push(`/room/${roomId}?host=true&user=${encodeURIComponent(name)}`);
  };

  const handleJoin = () => {
    if (roomCode.trim()) {
      const name = `User-${Math.random().toString(36).substring(7)}`;
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

      <div className="flex flex-col justify-center items-center min-h-[80vh] px-4">
        <div className="flex flex-col justify-center items-center w-full max-w-2xl">
          <h1 className="text-2xl md:text-3xl lg:text-4xl text-center mb-4 font-light">
            Stream movies together
          </h1>
          <p className="text-base md:text-xl text-center font-light mb-6 md:mb-8 text-gray-300">
            In sync, anywhere, anytime{" "}
            <span className="font-bold text-blue-600">Kalotare</span> makes
            movie nights easy.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={handleNewSync}
              className="bg-blue-600 text-white px-6 md:px-8 py-3 rounded-full font-light hover:bg-blue-700 transition-colors whitespace-nowrap flex gap-2 items-center justify-center"
            >
              <i className="fi fi-rr-video-plus flex  text-xl "></i>
              New Sync
            </button>

            <div
              className="w-full flex items-center  gap-4 px-4 py-4 border rounded-sm focus:outline-none focus:ring-2"
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
              <i className="fi fi-rr-keyboard flex text-2xl "></i>

              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
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
    </>
  );
}
