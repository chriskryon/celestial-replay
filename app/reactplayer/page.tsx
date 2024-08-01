/* eslint-disable prettier/prettier */
"use client";

import { useRef, useState } from "react";
import { Textarea } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import ReactPlayer from "react-player";

function Player() {
  const [videoInput, setVideoInput] = useState("");
  const [videos, setVideos] = useState<{ url: string; repetitions: number; }[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [currentRepetitions, setCurrentRepetitions] = useState(0);
  const playerRef = useRef(null);

  const handleButtonClick = () => {
    const parsedVideos = videoInput
      .split("\n")
      .filter(Boolean)
      .map((video) => {
        const [url, repetitionsStr] = video.split(";");
        const repetitions = parseInt(repetitionsStr, 10) || 1;

        return { url, repetitions };
      });

    setVideos(parsedVideos);
    setCurrentVideoIndex(0);
    setCurrentRepetitions(parsedVideos[0]?.repetitions || 0);
  };

  const handleVideoEnded = () => {
    if (currentRepetitions > 1) {
      setCurrentRepetitions((prev) => prev - 1);
      if (playerRef.current) {
        (playerRef.current as any).getInternalPlayer().playVideo();
      }
    } else {
      setCurrentVideoIndex((prev) => prev + 1);
      setCurrentRepetitions(videos[currentVideoIndex + 1]?.repetitions || 0);
      if (playerRef.current) {
        (playerRef.current as any).getInternalPlayer().playVideo();
      }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {currentRepetitions > 0 && (
        <>
          <ReactPlayer
            ref={playerRef}
            controls
            config={{
              youtube: {
                playerVars: { autoplay: 1 },
              },
              facebook: {
                appId: "12345",
              },
            }}
            playing={true}
            url={videos[currentVideoIndex]?.url}
            onEnded={handleVideoEnded}
          />
          <p className="">
            Remaining Repetitions: {currentRepetitions} of{" "}
            {videos[currentVideoIndex]?.repetitions}
          </p>
        </>
      )}
      <Textarea
        fullWidth
        className="w-full max-w-xl"
        color={"default"}
        errorMessage={"error"}
        label="Lista de vídeos (URL;Repetições por linha)"
        placeholder="Ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ;3"
        value={videoInput}
        onChange={(e) => setVideoInput(e.target.value)}
      />

      <Button
        className="w-full max-w-xl disabled:opacity-50 disabled:cursor-not-allowed"
        color="primary"
        onClick={handleButtonClick}
      >
        Iniciar
      </Button>
    </div>
  );
}

export default Player;
