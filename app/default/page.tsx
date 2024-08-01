'use client';
import { useState, useEffect } from "react";
import YouTube from "react-youtube";
import { Input } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import {Tabs, Tab} from "@nextui-org/tabs";


function YoutubeViewApp() {
 const [videoUrl, setVideoUrl] = useState("https://www.youtube.com/watch?v=OU5MimWzLF4");
 const [videoId, setVideoId] = useState("OU5MimWzLF4");
 const [repetitions, setRepetitions] = useState(0);
 const [remainingRepetitions, setRemainingRepetitions] = useState(0);
 const [player, setPlayer] = useState(null);
 const [error, setError] = useState(null);
 const [isStarted, setIsStarted] = useState(false);

 useEffect(() => {
  const updateVideoId = () => {
   const urlMatch = videoUrl.match(
    /(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
   );
   if (urlMatch) {
    setVideoId(urlMatch[1]);
    setError(null);
   } else {
    setVideoId("");
    setError("URL inválida. Insira uma URL do YouTube válida.");
   }
  };

  updateVideoId();
  setRemainingRepetitions(repetitions);
 }, [videoUrl, repetitions]);

 const handleStart = () => {
  if (player && repetitions > 0) {
    setIsStarted(true);
   player.playVideo();

  }
 };

 const onEnd = () => {
  if (remainingRepetitions > 1) {
   setRemainingRepetitions(remainingRepetitions - 1);
   player.playVideo();
  } else {
   setRemainingRepetitions(0);
   setIsStarted(false);
  }
 };

 const opts = {
  height: "390",
  width: "640",
  playerVars: {
   autoplay: 0,
  },
 };

 const onReady = (event) => {
  setPlayer(event.target);
 };

 return (
    <div className="flex flex-col items-center space-y-4">
    {videoId && !error && (
    <YouTube videoId={videoId} opts={opts} onReady={onReady} onEnd={onEnd} />
   )}

   <Input
    label="URL do vídeo do YouTube"
    placeholder="Ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    value={videoUrl}
    onChange={(e) => setVideoUrl(e.target.value)}
    fullWidth
    className="w-full max-w-xl"
    color={error ? "danger" : "default"}
    errorMessage={error}
   />
   <Input
    label="Quantidade de Repetições"
    type="number"
    value={repetitions.toString()}
    onChange={(e) => setRepetitions(parseInt(e.target.value, 10) || 0)}
    fullWidth
    className="w-full max-w-xl"
   />
   {isStarted && remainingRepetitions > 0 && (
    <div className="text-center mb-2">
     Remaining repetitions: {remainingRepetitions}
    </div>
   )}
   <Button
    color="primary"
    onClick={handleStart}
    disabled={!videoId || repetitions <= 0}
    className="w-full max-w-xl"
   >
    Iniciar
   </Button>
  </div>
 );
}

export default YoutubeViewApp;