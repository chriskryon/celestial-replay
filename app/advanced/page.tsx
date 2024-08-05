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
import { Accordion, AccordionItem } from "@nextui-org/accordion";

import { createStack } from "../utils/createStack";
import fetchValidStacks from "../utils/fetchValidStacks";
import validateInputs from "../utils/validateUrls";

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
  const [isPlaying, setIsPlaying] = useState(false);

  const { isOpen, onOpenChange } = useDisclosure(); // Hook para controlar o modal

  const [areAllUrlsValid, setAreAllUrlsValid] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastColor, setToastColor] = useState("success");

  const handleCloseToast = () => {
    console.log("fechando");
    setShowToast(false);
  };

  useEffect(() => {
    setAreAllUrlsValid(validateInputs(videoInput)); // Use a função utilitária
  }, [videoInput]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setStacks(fetchValidStacks());
    }
  }, []);

  const handleCreateStack = () => {
    if (stackName && videoInput) {
      const result = createStack(stackName, videoInput);

      if (result.success) {
        setShowToast(true);
        setToastColor("success");
        setToastMessage(`Stack ${stackName} created.`);
        setStacks(fetchValidStacks());
      } else {
        setShowToast(true);
        setToastColor("danger");
        setToastMessage(
          `Error while creating stack ${stackName}: ${result.error}`,
        );
      }
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
        const repetitions = parseInt(repetitionsStr, 10) || 0;

        return { url, repetitions };
      });

    setVideos(parsedVideos);
    setCurrentVideoIndex(0);
    setCurrentRepetitions(parsedVideos[0]?.repetitions || 0);
  };

  const handleVideoEnded = () => {
    if (currentRepetitions > 1) {
      setCurrentRepetitions((prev) => prev - 1);
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 1);
    } else {
      setCurrentVideoIndex((prev) => prev + 1);
      setCurrentRepetitions(videos[currentVideoIndex + 1]?.repetitions || 0);
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 1);
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
      {/* <Toast
        color={toastColor as "success" | "danger" | undefined}
        isVisible={showToast}
        message={toastMessage}
        onClose={handleCloseToast}
      /> */}

      <div className="bg-[#27272A] rounded-md bg-opacity-70 p-5 space-y-4">
        <div className="">
          <h4 className="text-center text-lg font-medium mt-5 mb-4">
            Advanced Plus
          </h4>
          <Divider />
          {stacks.length > 0 && <></>}

          {/* Instructions for the User */}
          <div className="text-left mt-4">
            <p className="text-white mb-1">
              <b>Instructions:</b>
            </p>
            <p className="text-white mb-1">
              <b>Play Saved Stacks:</b> Click on a stack button below, if any,
              to start playback.
            </p>
            <p className="text-white mb-1">
              <b>Create New Stack:</b> Click <b>Create New Stack</b> and enter
              video URLs and repetitions.
            </p>
            <p className="text-white mb-5">
              <b>Multiple Videos (No Save):</b> Enter video URLs and repetitions
              in the textarea, then click <code>Start</code>.
            </p>
          </div>

          <div>
            <Accordion variant="splitted">
              <AccordionItem
                key="1"
                aria-label="My Saved Stacks"
                title={<h3 className="text-sm">My saved stacks</h3>}
              >
                {stacks.length === 0 ? (
                  <p>No stacks saved yet.</p>
                ) : (
                  <>
                    <p className="text-left text-small text-default-400 mb-3">
                      Just click on some button to play automatically.
                    </p>
                    <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                      {stacks.map((stack) => {
                        const lastDashIndex = stack.name.lastIndexOf("-");
                        const displayName =
                          lastDashIndex !== -1
                            ? stack.name.substring(0, lastDashIndex)
                            : stack.name;

                        return (
                          <div
                            key={stack.name}
                            className="flex justify-center items-center h-12"
                          >
                            {" "}
                            {/* Adiciona altura fixa e centraliza verticalmente */}
                            <Button
                              className="w-full h-full" // Ocupa toda a largura e altura da célula
                              variant="ghost"
                              onClick={() =>
                                handleLoadStack(JSON.stringify(stack.videos))
                              }
                            >
                              {displayName}
                            </Button>
                          </div>
                        );
                      })}
                    </ul>
                  </>
                )}
              </AccordionItem>
            </Accordion>
          </div>
          <Divider className="mt-5" />
        </div>
        <h4 className="text-left text-small font-medium mt-5">
          Multiple Videos Repeat
        </h4>
        <p className="text-left text-small text-default-400 mb-1">
          Template: VIDEO_URL;REPETITIONS
        </p>
        <div className="">
          <div className="bg-[#27272A] rounded-md">
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
                  playing={isPlaying}
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
              color={areAllUrlsValid ? "primary" : "danger"}
              isDisabled={!areAllUrlsValid}
              onClick={handleButtonClick}
            >
              {areAllUrlsValid ? "Start" : "Waiting for valid input"}
            </Button>
            <Button
              className="mt-3 w-full max-w-xl disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onOpenChange}
            >
              Create new stack
            </Button>
          </div>
        </div>
      </div>

      {/* teste */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Create new stack</ModalHeader>
              <ModalBody>
                <Input
                  label="Stack name"
                  type="text"
                  value={stackName}
                  onChange={(e) => setStackName(e.target.value)}
                />

                <Textarea
                  fullWidth
                  className="w-full max-w-xl"
                  color={"default"}
                  errorMessage={"error"}
                  label="Stack template (URL;Repetitions) by line"
                  placeholder="Ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ;3"
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                />
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
                <Button
                  color={validateInputs(videoInput) ? "primary" : "danger"}
                  isDisabled={!validateInputs(videoInput)}
                  onPress={() => {
                    handleCreateStack();
                    onClose();
                  }}
                >
                  {validateInputs(videoInput)
                    ? "Create Stack"
                    : "Waiting for valid input"}
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
