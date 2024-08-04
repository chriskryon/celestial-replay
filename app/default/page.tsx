"use client";
import { useState, useEffect, useRef } from "react";
import ReactPlayer from "react-player";
import { Input } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import React from "react";

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
  // useEffect(() => {
  //   if (videoUrl) {
  //     setRemainingRepetitions(repetitions);
  //   }
  // }, [urlInput, repetitionsInput]); // Dependency array includes videoUrl

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
      if (playerRef.current) {
        (playerRef.current as any).getInternalPlayer().playVideo();
      }
    } else {
      setRemainingRepetitions(0);
      setIsPlaying(false);
      setVideoUrl(null); // Clear videoUrl after all repetitions
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

  return (
    <div className="bg-[#27272A] rounded-md bg-opacity-70 p-5 flex flex-col items-center space-y-4">
      <h4 className="text-left text-small font-medium mt-5">
        Single Video Repeat
      </h4>
      {videoUrl && ( // Only render ReactPlayer when videoUrl is set
        <ReactPlayer
          ref={playerRef}
          controls
          height="300px"
          playing={isPlaying}
          url={videoUrl}
          width="100%"
          onEnded={handleEnded}
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
        color="primary"
        disabled={error !== null || repetitionsInput <= 0}
        onClick={handlePlay}
      >
        Start
      </Button>
      {error && <Alert message={error} />}
    </div>
  );
}

export default YoutubeViewApp;
