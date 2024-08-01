"use client";
import { useState, useEffect, SetStateAction } from "react";
import YouTube from "react-youtube";
import { Textarea } from "@nextui-org/input";
import { Button } from "@nextui-org/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from "@nextui-org/table";
import { Chip } from "@nextui-org/chip";

function Advanced() {
  const [videoInput, setVideoInput] = useState("");
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [currentRepetition, setCurrentRepetition] = useState(0);
  const [videosToPlay, setVideosToPlay] = useState([]);
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [shouldProcessVideos, setShouldProcessVideos] = useState(false);

  useEffect(() => {
    if (shouldProcessVideos) {
      const lines = videoInput.split("\n").filter(Boolean);
      const videos = lines
        .map((line) => {
          const [url, repetitions] = line.split(";");
          const match = url.match(
            /(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
          );

          if (!match) {
            setError("URL inválida em uma das linhas. Verifique o formato.");

            return null;
          }

          return {
            videoId: match[1],
            repetitions: parseInt(repetitions, 10) || 0,
          };
        })
        .filter(Boolean);

      setVideosToPlay(videos);
      setCurrentVideoIndex(0);
      setCurrentRepetition(0);
      setError(null);
    }
  }, [shouldProcessVideos]);

  const handleStart = () => {
    setIsStarted(true);
    setShouldProcessVideos(true); // Ativa o processamento dos vídeos
    playNextVideo();
  };

  // Carrega o próximo vídeo da lista
  const playNextVideo = () => {
    const currentVideo = videosToPlay[currentVideoIndex];

    if (player && currentVideo && playerReady) {
      setCurrentRepetition(1); // Inicia a contagem de repetições para o vídeo atual
      player.loadVideoById(currentVideo.videoId);
      player.playVideo(); // Inicia a reprodução do vídeo após o carregamento
    }
  };

  // Controla o fim de cada vídeo e a progressão na lista
  const onEnd = () => {
    console.log("currentRepetition", currentRepetition);
    if (currentRepetition < videosToPlay[currentVideoIndex].repetitions) {
      console.log("Primeiro IF");
      setCurrentRepetition(currentRepetition + 1);
      player.playVideo();
    } else {
      console.log("Primeiro Else");
      // Passa para o próximo vídeo da lista SOMENTE se não for o último
      if (currentVideoIndex + 1 < videosToPlay.length) {
        console.log("Segundo if");
        setCurrentVideoIndex(currentVideoIndex + 1);
        setPlayerReady(false);
        playNextVideo();
      } else {
        console.log("Segundo else");
        // Fim da lista de vídeos
        setIsStarted(false);
        setCurrentVideoIndex(0);
        setCurrentRepetition(0);
      }
    }
  };

  const opts = {
    // Opções do player do YouTube
    height: "390",
    width: "640",
    playerVars: {
      autoplay: 1,
    },
  };

  const onReady = (event: { target: SetStateAction<null> }) => {
    setPlayer(event.target);
    setPlayerReady(true); // Define o player como pronto
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {videosToPlay.length > 0 && currentVideoIndex < videosToPlay.length && (
        <YouTube
          opts={opts}
          videoId={videosToPlay[currentVideoIndex].videoId}
          onEnd={onEnd}
          onReady={onReady}
        />
      )}

      <Textarea
        fullWidth
        className="w-full max-w-xl"
        color={error ? "danger" : "default"}
        errorMessage={error}
        label="Lista de vídeos (URL;Repetições por linha)"
        placeholder="Ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ;3"
        value={videoInput}
        onChange={(e) => setVideoInput(e.target.value)}
      />

      {isStarted && currentRepetition > 0 && (
        <div className="text-center mb-2">
          Repetição atual: {currentRepetition} de{" "}
          {videosToPlay[currentVideoIndex].repetitions}
        </div>
      )}
      <Button
        className="w-full max-w-xl disabled:opacity-50 disabled:cursor-not-allowed" // Estilos para o botão desabilitado
        color="primary"
        // disabled={videosToPlay.length === 0 || !playerReady} // Desabilita se não houver vídeos, o player não estiver pronto ou a reprodução já tiver começado
        onClick={handleStart}
      >
        Iniciar
      </Button>
      <Table
        aria-label="Lista de vídeos"
        color="default"
        defaultSelectedKeys={[2]} // Marca a linha do vídeo atual como selecionada
        selectionMode="single" // Permite selecionar apenas uma linha
        onSelectionChange={() => {}} // Função vazia para evitar erros (não precisamos de ação ao selecionar)
      >
        <TableHeader>
          <TableColumn>URL do Vídeo</TableColumn>
          <TableColumn>Repetições</TableColumn>
          <TableColumn>Status</TableColumn>
        </TableHeader>
        <TableBody>
          {videosToPlay.map(
            (video: { videoId: string; repetitions: number }, index) => (
              <TableRow key={index}>
                <TableCell>{video.videoId}</TableCell>
                <TableCell>{video.repetitions}</TableCell>
                <TableCell>
                  <Chip
                    color={index === currentVideoIndex ? "primary" : "default"} // Destaca o vídeo em execução
                    variant="flat"
                  >
                    {index === currentVideoIndex ? "Em execução" : "Pendente"}
                  </Chip>
                </TableCell>
              </TableRow>
            )
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default Advanced