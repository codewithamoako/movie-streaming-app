"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

// Mock movie list - will be connected to actual movie database later
const AVAILABLE_MOVIES = [
  { id: "1", title: "Sample Movie 1", thumbnail: "🎬" },
  { id: "2", title: "Sample Movie 2", thumbnail: "🎥" },
  { id: "3", title: "Sample Movie 3", thumbnail: "🎞️" },
  { id: "4", title: "Sample Movie 4", thumbnail: "📽️" },
];

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

export default function Popup() {
  const router = useRouter();

  // Host settings
  const [maxParticipants, setMaxParticipants] = useState(2);
  const [movieSource, setMovieSource] = useState<"own" | "website">("website");
  const [ownMovieUrl, setOwnMovieUrl] = useState("");
  const [selectedMovie, setSelectedMovie] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleStartRoom = () => {
    const room = Math.random().toString(36).substring(7);
    const account = getAccount();
    const name = account?.userName || "Guest";

    // Build query params
    const params = new URLSearchParams({
      host: "true",
      user: encodeURIComponent(name),
      maxParticipants: maxParticipants.toString(),
      movieSource: movieSource,
    });

    if (movieSource === "own") {
      params.set("movieUrl", encodeURIComponent(ownMovieUrl));
    } else {
      params.set("movieId", selectedMovie);
    }

    router.push(`/room/${room}?${params.toString()}`);
  };

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredMovies = AVAILABLE_MOVIES.filter((movie) =>
    movie.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelectMovie = (movie: (typeof AVAILABLE_MOVIES)[0]) => {
    setSelectedMovie(movie.id);
    setSearchQuery(movie.title);
    setShowSearchResults(false);
  };

  const isValid =
    (movieSource === "website" && selectedMovie) ||
    (movieSource === "own" && ownMovieUrl);

  return (
    <div className="flex flex-col justify-center gap-4 md:gap-6 ">
      <p className="text-gray-600 pl-6 text-sm md:text-base">
        Set up your movie watching room
      </p>

      <div className="flex flex-col gap-4 w-full max-w-md px-4">
        {/* Host Settings */}
        <div className="rounded-lg px-2 space-y-4 text-black">
          {/* Movie Source Selection */}
          <div>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="movieSource"
                  value="website"
                  checked={movieSource === "website"}
                  onChange={(e) =>
                    setMovieSource(e.target.value as "own" | "website")
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">From Website</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="movieSource"
                  value="own"
                  checked={movieSource === "own"}
                  onChange={(e) =>
                    setMovieSource(e.target.value as "own" | "website")
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">Your Own Movie</span>
              </label>
            </div>

            {/* Movie Selection - From Website */}
            {movieSource === "website" && (
              <div ref={searchRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedMovie("");
                      setShowSearchResults(true);
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    placeholder="Search for a movie..."
                    className="w-full px-2 py-2 border text-sm border-gray-300 rounded-sm text-gray-900 bg-white"
                  />

                  <p className="text-xs text-gray-500 mt-1">
                    A movie might not be in our database.
                  </p>
                  {showSearchResults && searchQuery && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-sm max-h-60 overflow-y-auto">
                      {filteredMovies.length > 0 ? (
                        filteredMovies.map((movie) => (
                          <button
                            key={movie.id}
                            onClick={() => handleSelectMovie(movie)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-gray-900"
                          >
                            {movie.thumbnail} {movie.title}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          No movies found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {selectedMovie && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Selected:{" "}
                    {
                      AVAILABLE_MOVIES.find((m) => m.id === selectedMovie)
                        ?.title
                    }
                  </p>
                )}
              </div>
            )}

            {/* Movie URL - Your Own Movie */}
            {movieSource === "own" && (
              <div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Create a local URL for the file
                      const fileUrl = URL.createObjectURL(file);
                      setOwnMovieUrl(fileUrl);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-sm text-gray-900 bg-white text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Select a video file (.mp4, .webm, .mkv, etc.)
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleStartRoom}
          disabled={!isValid}
          className={`w-full px-4 py-3 rounded-sm font-bold ${
            !isValid
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          🎬 Start Room
        </button>
      </div>
    </div>
  );
}
