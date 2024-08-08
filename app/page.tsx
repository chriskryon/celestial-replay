import { Link } from "@nextui-org/link";

import { title } from "@/components/primitives";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 text-white bg-black bg-opacity-50 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
      <div className="inline-block max-w-full text-center justify-center p-5">
        <h1 className={title()}>Celestial</h1>
        <h1 className={title({ color: "blue" })}>Replay</h1>
        <br />
        <h2 className="my-2 text-lg lg:text-xl text-default-600 block max-w-full">
          Celestial Replay is a personal project developed to explore and learn
          the capabilities of Next.js. It is a simple yet powerful tool that
          allows you to create and manage playlists of videos, repeating them as
          many times as you like.
        </h2>

        <h2 className="text-xl font-semibold text-white mt-4 text-left">
          How it Works
        </h2>

        <p className="text-white text-left">
          Celestial Replay uses the &quot;react-player&quot; library to
          seamlessly play videos from various platforms. You can create
          &quot;stacks&quot; of videos, each with its own number of repetitions.
          These stacks are stored in your browser&quot;s local storage, so you
          can access them even after closing the page, but just in the same
          browser.
        </p>
      </div>

      {/* Descrição das funcionalidades com links e hover effect */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 z-10 m-3 ">
        <Link href="/default">
          <div className="bg-black/70 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer text-white relative overflow-hidden hover:border-2 hover:border-blue-500">
            <h3 className="text-xl font-semibold mb-2">Default</h3>
            <p>
              Replay a single video on loop, perfect for focusing on specific
              content or creating a calming atmosphere.
            </p>
          </div>
        </Link>
        <Link href="/advanced">
          <div className="bg-black/70 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer text-white relative overflow-hidden hover:border-2 hover:border-blue-500">
            <h3 className="text-xl font-semibold mb-2">Advanced+</h3>
            <p>
              Craft and save your own video playlists with custom repetitions.
              Perfect for curating unique experiences and taking full control of
              your replays.
            </p>
          </div>
        </Link>
        <Link href="/stackeditor">
          <div className="bg-black/70 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer text-white relative overflow-hidden hover:border-2 hover:border-blue-500">
            <h3 className="text-xl font-semibold mb-2">Stack Editor</h3>
            <p>
              Easily manage your saved video stacks. Update URLs, adjust
              repetitions, and fine-tune your playlists to perfection.
            </p>
          </div>
        </Link>
        <Link href="/history">
          <div className="bg-black/70 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer text-white relative overflow-hidden hover:border-2 hover:border-blue-500">
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
