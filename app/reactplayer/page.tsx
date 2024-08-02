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
  >([]);
  const { isOpen, onOpenChange } = useDisclosure(); // Hook para controlar o modal

  useEffect(() => {
    // Verifica se está no ambiente do navegador (client-side)
    if (typeof window !== "undefined") {
      const storedStacks = localStorage.getItem("videoStacks");

      if (storedStacks) {
        setStacks(JSON.parse(storedStacks));
      }
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
  };

  return (
    <>
      <div className="bg-[#27272A] rounded-md bg-opacity-30 p-5">
        <div className="">
          <h4 className="text-left text-small font-medium">My Saved Stacks</h4>
          <p className="text-left text-small text-default-400">
            Just click on some button to play automatically.
          </p>
          <ul className="flex flex-wrap items-start justify-left">
            {" "}
            {/* Adiciona classes para flexbox */}
            {Object.entries(localStorage)
              .filter(([key, value]) => {
                if (key === "theme" || key === "ally-supports-cache") {
                  return false;
                }

                try {
                  const parsedValue = JSON.parse(value);

                  return (
                    Array.isArray(parsedValue) &&
                    parsedValue.every(
                      (item) =>
                        typeof item === "object" &&
                        "url" in item &&
                        "repetitions" in item,
                    )
                  );
                } catch (error) {
                  return false; // Não é um JSON válido
                }
              })
              .map(
                (
                  [stackName, stackValue], // Desestrutura o par [chave, valor]
                ) => (
                  <li key={stackName} className="mr-2 mb-2">
                    {" "}
                    {/* Adiciona classes para margens */}
                    <Button
                      variant="ghost"
                      onClick={() => handleLoadStack(stackValue)}
                    >
                      {" "}
                      {/* Muda para variant="ghost" */}
                      {stackName} {/* Exibe o nome da stack */}
                    </Button>
                  </li>
                ),
              )}
          </ul>
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
                    facebook: {
                      appId: "12345",
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
