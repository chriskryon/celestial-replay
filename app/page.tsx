import { Link } from "@nextui-org/link";
import Image from "next/image";

import { title, subtitle } from "@/components/primitives";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 bg-gradient-to-r from-blue-900 to-black-900 text-white">
      {/* Imagem de fundo com estrelas */}
      {/* <div className="absolute inset-0 z-0">
        <Image
          alt="Background with stars"
          className="opacity-50"
          layout="fill"
          objectFit="cover"
          src="/bg.jpg"
        />
      </div> */}

      <div className="inline-block max-w-lg text-center justify-center">
        <h1 className={title()}>Celestial</h1>
        <h1 className={title({ color: "blue" })}>Replay</h1>
        <br />
        <h2 className={subtitle({ class: "mt-4" })}>
          Rediscover your favorite moments, again and again.
        </h2>
      </div>

      {/* Descrição das funcionalidades com links e hover effect */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 z-10 m-3 ">
        <Link href="/default">
          <div className="bg-black/70 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer text-white">
            <h3 className="text-xl font-semibold mb-2">Default</h3>
            <p>
              Replay a single video on loop, perfect for focusing on specific
              content or creating a calming atmosphere.
            </p>
          </div>
        </Link>
        <Link href="/advanced">
          <div className="bg-black/70 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer text-white">
            <h3 className="text-xl font-semibold mb-2">Advanced+</h3>
            <p>
              Craft and save your own video playlists with custom repetitions.
              Perfect for curating unique experiences and taking full control of
              your replays.
            </p>
          </div>
        </Link>
        <Link href="/stackeditor">
          <div className="bg-black/70 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer text-white">
            <h3 className="text-xl font-semibold mb-2">Stack Editor</h3>
            <p>
              Easily manage your saved video stacks. Update URLs, adjust
              repetitions, and fine-tune your playlists to perfection.
            </p>
          </div>
        </Link>
        <Link href="/history">
          <div className="bg-black/70 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer text-white">
            <h3 className="text-xl font-semibold mb-2">History</h3>
            <p>
              Track your video replays. See how many times you have watched a
              video and explore your listening history by date.
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
}
