/* eslint-disable prettier/prettier */
"use client";

import { useEffect, useRef, useState } from "react";
import { Input, Textarea } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import ReactPlayer from "react-player";

function Player() {
  const [videoInput, setVideoInput] = useState("");
  const [videos, setVideos] = useState<{ url: string; repetitions: number; }[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [currentRepetitions, setCurrentRepetitions] = useState(0);
  const playerRef = useRef(null);

  const [stackName, setStackName] = useState("");
  const [stacks, setStacks] = useState<{ name: string; videos: { url: string; repetitions: number }[] }[]>(
    []
  );

  useEffect(() => {
    // Carrega as stacks salvas no localStorage ao montar o componente
    const storedStacks = localStorage.getItem("videoStacks");
    if (storedStacks) {
      setStacks(JSON.parse(storedStacks));
    }
  }, []);

  const handleCreateStack = () => {
    if (stackName && videoInput) {
      const parsedVideos = videoInput
        .split("\n")
        .filter(Boolean)
        .map((video) => {
          const [url, repetitionsStr] = video.split(";");
          const repetitions = parseInt(repetitionsStr, 10) || 1;
          return { url, repetitions };
        });

      const newStack = { name: stackName, videos: parsedVideos };
      setStacks([...stacks, newStack]);
      localStorage.setItem(stackName, JSON.stringify(parsedVideos)); // Salva com o nome da stack
      setStackName("");
      setVideoInput("");
    }
  };

  const handleLoadStack = (stackName: string) => {
    const storedVideos = localStorage.getItem(stackName);
    if (storedVideos) {
      const parsedVideos = JSON.parse(storedVideos);
      setVideos(parsedVideos);
      setCurrentVideoIndex(0);
      setCurrentRepetitions(parsedVideos[0]?.repetitions || 0);

      // Carrega o conteúdo da stack no textarea
      const videoInputFromStack = parsedVideos
        .map((video) => `${video.url};${video.repetitions}`)
        .join("\n");
      setVideoInput(videoInputFromStack);

      // Inicia a reprodução automaticamente
      handleButtonClick(); // Chama a função que inicia a reprodução
    }
  };

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
    <div className="container flex flex-col items-center space-y-4">
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

    <Input
        type="text"
        label="Nome da Stack"
        value={stackName}
        onChange={(e) => setStackName(e.target.value)}
      />

      <Textarea
        fullWidth
        className="w-full max-w-xl"
        color={"default"}
        errorMessage={"error"}
        label="Criar Stack (URL;Repetições por linha)"
        placeholder="Ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ;3"
        value={videoInput}
        onChange={(e) => setVideoInput(e.target.value)}
      />

      <Button onClick={handleCreateStack}>Criar Stack</Button>

      <div>
        <h2>Stacks Salvas:</h2>
        <ul>
          {Object.keys(localStorage)
            .filter((key) => key !== "theme" && key !== "ally-supports-cache")
            .map((stackName) => (
              <li key={stackName}>
                <Button onClick={() => handleLoadStack(stackName)}>
                  {stackName}
                </Button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

export default Player;
