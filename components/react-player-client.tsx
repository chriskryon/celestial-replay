"use client";

import { forwardRef } from "react";
import ReactPlayer from "react-player";

export { default as ReactPlayerCanPlay } from "react-player";

// forwardRef de verdade: ref do pai chega ao <video>/<youtube-video-element>
// interno do ReactPlayer v3 (HTMLMediaElement). Sem isso playerRef.current
// fica null e o play dentro do gesto de clique nunca acontece.
const ClientReactPlayer = forwardRef<HTMLVideoElement, React.ComponentProps<typeof ReactPlayer>>(
  function ClientReactPlayer(props, ref) {
    return <ReactPlayer {...props} ref={ref} />;
  },
);

ClientReactPlayer.displayName = "ClientReactPlayer";

export default ClientReactPlayer;
