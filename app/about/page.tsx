// pages/about.tsx

export default function About() {
  return (
    <div className="bg-[#27272A] rounded-md bg-opacity-70 p-5 flex flex-col items-left space-y-4 text-left">
      <h1 className="text-x1">About Celestial Replay</h1>

      <p className="text-white">
        Celestial Replay is a personal project developed to explore and learn
        the capabilities of Next.js. It&rsquo;s a simple yet powerful tool that
        allows you to create and manage playlists of videos, repeating them as
        many times as you like.
      </p>

      <h2 className="text-xl font-semibold text-white mt-4">How it Works</h2>

      <p className="text-white">
        Celestial Replay uses the &quot;react-player&quot; library to seamlessly
        play videos from various platforms like YouTube, Facebook, SoundCloud,
        and more. You can create &quot;stacks&quot; of videos, each with its own
        number of repetitions. These stacks are stored in your browser&quot;s
        local storage, so you can access them even after closing the page.
      </p>

      <h2 className="text-xl font-semibold text-white mt-4">Features</h2>

      <ul className="list-disc text-white ml-6">
        <li>Single Video Repeat: Loop a single video continuously.</li>
        <li>
          Advanced+ Playlists: Create and save custom video playlists with
          specific repetitions for each video.
        </li>
        <li>
          Stack Editor: Manage your saved video stacks, updating URLs and
          repetitions.
        </li>
        <li>
          History: Track your video replays and view your listening history.
        </li>
      </ul>

      <p className="text-white mt-4">
        This project is a work in progress, and I'm constantly adding new
        features and improvements. If you have any suggestions or feedback, feel
        free to reach out!
      </p>
    </div>
  );
}
