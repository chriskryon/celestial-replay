"use client";
import { useState, useEffect, useRef } from "react";
import ReactPlayer from "react-player";
import { Input } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import React from "react";
import { Divider } from "@nextui-org/divider";

import Alert from "@/components/alert";

function YoutubeViewApp() {
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [repetitions, setRepetitions] = useState(0);
  const [remainingRepetitions, setRemainingRepetitions] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(null);
  const [repetitionsInput, setRepetitionsInput] = useState(1);
  const [urlInput, setUrlInput] = useState("");
  const [isRepetitionsInvalid, setIsRepetitionsInvalid] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const validUrl = (value: string) =>
    value.match(
      /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi,
    );

  const isInvalid = React.useMemo(() => {
    if (urlInput === "") return false;

    if (validUrl(urlInput)) {
      const result = !ReactPlayer.canPlay(urlInput);

      setError(result ? "Sorry, we can not play this video link." : null);

      return result;
    } else {
      setError("Invalid URL format");

      return true;
    }
  }, [urlInput]);

  useEffect(() => {
    if (!isPlaying && ReactPlayer.canPlay(urlInput)) {
      setError(null);
      setVideoUrl(urlInput);
    }
  }, [urlInput]);

  useEffect(() => {
    setIsRepetitionsInvalid(isNaN(repetitionsInput) || repetitionsInput <= 0);
  }, [repetitionsInput]);

  const handlePlay = () => {
    if (repetitionsInput > 0 && urlInput) {
      setVideoUrl(urlInput);
      setRemainingRepetitions(repetitionsInput);
      setIsPlaying(true);
    } else {
      setError("Invalid input. Enter a URL.");
    }
  };

  const handleEnded = () => {
    if (remainingRepetitions > 1) {
      setRemainingRepetitions(remainingRepetitions - 1);
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 1);
    } else {
      setRemainingRepetitions(0);
      setIsPlaying(false);
      setVideoUrl(null);
      if (videoUrl) {
        updatePlaybackStatistics(videoUrl);
      }
    }
  };

  const updatePlaybackStatistics = (url: string) => {
    if (typeof window !== "undefined") {
      let stats = JSON.parse(localStorage.getItem("celestial-stats") || "[]");

      stats.push({ url, lastPlayed: new Date().toISOString() });

      localStorage.setItem("celestial-stats", JSON.stringify(stats));
    }
  };

  const handleReady = () => {
    setIsReady(true);
    console.log("Vìdeo pronto para execução");
  };

  return (
    <div className="bg-[#27272A] rounded-md bg-opacity-70 p-5 flex flex-col items-center space-y-4">
      <h4 className="text-left text-lg font-medium mt-5">
        Single Video Repeat
      </h4>
      <Divider />

      <div className="text-center mb-4">
        <p className="text-white">
          Paste the video URL in the field below and set how many times you want
          you want to repeat it.
        </p>
        <p className="text-sm text-gray-500">
          YouTube, Facebook, SoundCloud, Streamable, Vimeo, Mux, Wistia, Twitch,
          DailyMotion, Vidyard, Kaltura, HLS streams, DASH streams, videos and
          audio supported.
        </p>
      </div>

      <Divider />

      {videoUrl && ( // Only render ReactPlayer when videoUrl is set
        <ReactPlayer
          ref={playerRef}
          controls
          config={{
            youtube: {
              playerVars: { autoplay: 0 },
            },
            facebook: {
              appId: "513502334686034", // Substitua com seu ID de aplicativo do Facebook, se necessário
            },
            soundcloud: {
              options: {
                auto_play: false,
              },
            },
            vimeo: {
              playerOptions: {
                autoplay: false,
              },
            },
          }}
          height="300px"
          playing={isPlaying}
          url={videoUrl}
          width="100%"
          onEnded={handleEnded}
          onReady={handleReady}
        />
      )}

      <Input
        fullWidth
        className="w-full max-w-xl"
        color={isInvalid ? "danger" : "default"}
        errorMessage={error}
        isInvalid={isInvalid}
        label="URL of the video"
        placeholder="Ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        value={urlInput}
        onChange={(e) => {
          setUrlInput(e.target.value);
        }}
      />

      <Input
        fullWidth
        className="w-full max-w-xl"
        color={isRepetitionsInvalid ? "danger" : "default"}
        isInvalid={isRepetitionsInvalid}
        errorMessage={
          isRepetitionsInvalid
            ? "Invalid input. Enter a positive number."
            : undefined
        } // Conditional error message
        label="Number of repetitions"
        type="number"
        value={repetitionsInput.toString()}
        onChange={(e) => setRepetitionsInput(parseInt(e.target.value, 10) || 1)}
      />

      {isPlaying && remainingRepetitions > 0 && (
        <div className="text-center mb-2">
          Remaining Repetitions: {remainingRepetitions}
        </div>
      )}

      <Button
        className="w-full max-w-xl"
        color={isReady ? "primary" : "danger"}
        disabled={error !== null || repetitionsInput <= 0 || !isReady}
        onClick={handlePlay}
      >
        {isReady ? "Play" : "Waiting for a valid link"}{" "}
        {/* Texto condicional */}
      </Button>
      {error && <Alert message={error} />}
    </div>
  );
}

export default YoutubeViewApp;
