"use client";

import { useEffect, useRef, useState } from "react";
import { Input, Textarea } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@nextui-org/modal";
import ReactPlayer from "react-player";
import { Divider } from "@nextui-org/divider";

import { createStack } from "../utils/createStack";
import fetchValidStacks from "../utils/fetchValidStacks";

function Player() {
  const [videoInput, setVideoInput] = useState("");
  const [videos, setVideos] = useState<{ url: string; repetitions: number }[]>(
    [],
  );
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [currentRepetitions, setCurrentRepetitions] = useState(0);
  const playerRef = useRef(null);

  const [stackName, setStackName] = useState("");
  const [stacks, setStacks] = useState<
    { name: string; videos: { url: string; repetitions: number }[] }[]
  >(
    typeof window !== "undefined" ? fetchValidStacks() : [], // Carrega as stacks válidas no estado inicial
  );

  const { isOpen, onOpenChange } = useDisclosure(); // Hook para controlar o modal

  useEffect(() => {
    if (typeof window !== "undefined") {
      setStacks(fetchValidStacks());
    }
  }, []);

  const handleCreateStack = () => {
    if (stackName && videoInput) {
      createStack(stackName, videoInput);
      setStackName("");
      setVideoInput("");
    }
  };

  const handleLoadStack = (stackValue: string) => {
    try {
      const parsedVideos = JSON.parse(stackValue);

      setVideos(parsedVideos);
      setCurrentVideoIndex(0);
      setCurrentRepetitions(parsedVideos[0]?.repetitions || 0);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Erro ao carregar a stack:", error);
      // Lógica para lidar com o erro (exibir uma mensagem para o usuário)
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

    const currentVideoUrl = videos[currentVideoIndex]?.url;

    if (currentVideoUrl) {
      updatePlaybackStatistics(currentVideoUrl);
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
    <>
      {/* <div>
      <Toast message="Stack criada com sucesso!" />
      </div> */}
      <div className="bg-[#27272A] rounded-md bg-opacity-70 p-5">
        <div className="">
          <h4 className="text-left text-lg font-medium mt-5">Advanced Plus</h4>
          <Divider />
          {stacks.length > 0 && <></>}

          {/* Instructions for the User */}
          <div className="text-left mb-4">
            <p className="text-white text-sm">
              <b>Play Saved Stacks:</b> Click on a stack button below, if any,
              to start playback.
              <br />
              <b>Create New Stack:</b> Click <b>Create New Stack</b> and enter
              video URLs and repetitions.
              <br />
              <b>Multiple Videos (No Save):</b> Enter video URLs and repetitions
              in the textarea, then click Start.
            </p>
          </div>

          <h4 className="text-left text-small font-medium mt-5">
            My Saved Stacks
          </h4>
          <p className="text-left text-small text-default-400 mb-3">
            Just click on some button to play automatically.
          </p>
          <div>
            {stacks.length === 0 ? (
              <p>No stacks saved yet.</p>
            ) : (
              <>
                <ul className="flex flex-wrap items-start justify-left">
                  {stacks.map((stack) => {
                    const lastDashIndex = stack.name.lastIndexOf("-");
                    const displayName =
                      lastDashIndex !== -1
                        ? stack.name.substring(0, lastDashIndex)
                        : stack.name;

                    return (
                      <li key={stack.name} className="mr-2 mb-2">
                        <Button
                          variant="ghost"
                          onClick={() =>
                            handleLoadStack(JSON.stringify(stack.videos))
                          }
                        >
                          {displayName}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
          <Divider />
        </div>
        {/* esquerda */}
        <h4 className="text-left text-small font-medium mt-5">
          Multiple Videos Repeat
        </h4>
        <p className="text-left text-small text-default-400 mb-1">
          Template: VIDEO_URL;REPETITIONS
        </p>
        <div className="">
          <div className="bg-[#27272A] rounded-md">
            {/* Div esquerda */}
            {/* Conteúdo da div esquerda */}
            {currentRepetitions > 0 && (
              <>
                <ReactPlayer
                  ref={playerRef}
                  controls
                  config={{
                    youtube: {
                      playerVars: { autoplay: 1 },
                    },
                    soundcloud: {
                      options: {
                        auto_play: true,
                      },
                    },
                    vimeo: {
                      playerOptions: {
                        autoplay: true,
                      },
                    },
                  }}
                  height={"200px"}
                  playing={true}
                  url={videos[currentVideoIndex]?.url}
                  width={"100%"}
                  onEnded={handleVideoEnded}
                />
              </>
            )}
          </div>
        </div>

        <div className="col-span-3 row-span-3 col-start-3 row-start-2">
          <div className="">
            {" "}
            {/* Div direita */}
            {/* Conteúdo da div direita */}
            {currentRepetitions > 0 && (
              <p className="">
                Remaining Repetitions: {currentRepetitions} of{" "}
                {videos[currentVideoIndex]?.repetitions}
              </p>
            )}
            <Textarea
              fullWidth
              className=""
              color={"default"}
              errorMessage={"error"}
              label="url;repetitions (per line)"
              placeholder="Ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ;3"
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
            />
            <Button
              className="w-full max-w-xl disabled:opacity-50 disabled:cursor-not-allowed"
              color="primary"
              onClick={handleButtonClick}
            >
              Start
            </Button>
            <Button
              className="mt-3 w-full max-w-xl disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onOpenChange}
            >
              Criar Nova Stack
            </Button>
          </div>
        </div>
      </div>

      {/* teste */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Criar Nova Stack</ModalHeader>
              <ModalBody>
                <Input
                  label="Nome da Stack"
                  type="text"
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
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Fechar
                </Button>
                <Button
                  color="primary"
                  onPress={() => {
                    handleCreateStack();
                    onClose();
                  }}
                >
                  Criar Stack
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

export default Player;
