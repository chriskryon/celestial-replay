import Image from "next/image"; // Importe o componente Image

import { title, subtitle } from "@/components/primitives";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 bg-gradient-to-r from-blue-900 to-black-900  text-white">
      {/* Imagem de fundo com estrelas */}
      <div className="absolute inset-0 z-0">
        <Image
          alt="Fundo de estrelas"
          className="opacity-50"
          layout="fill"
          objectFit="cover"
          src="/bg.jpg" // Substitua pelo caminho da sua imagem
        />
      </div>

      <div className="inline-block max-w-lg text-center justify-center z-10">
        {" "}
        {/* Adiciona z-index para ficar acima da imagem */}
        <h1 className={title()}>Celestial</h1>
        <h1 className={title({ color: "blue" })}>Replay</h1>
        <br />
        <h2 className={subtitle({ class: "mt-4" })}>
          Loop your favorite videos infinitely.
        </h2>
      </div>

      {/* Descrição das funcionalidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 z-10 m-3">
        <div className="bg-black/50 p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-2">Default</h3>
          <p>
            Play a single video repeatedly, ideal for focusing on specific
            content.
          </p>
        </div>
        <div className="bg-black/50 p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-2">Advanced+</h3>
          <p>
            Create and save video stacks with different loops. Ideal for
            creating custom playlists and having full control over your replay
            replay experience.
          </p>
        </div>
      </div>
    </section>
  );
}
