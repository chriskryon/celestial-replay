"use client";

import { forwardRef } from "react";
import ReactPlayer from "react-player";

type ClientProps = React.ComponentProps<typeof ReactPlayer> & {
  // Prop comum (sobrevive ao next/dynamic, que não repassa `ref`).
  innerRef?: React.Ref<HTMLVideoElement>;
};

// forwardRef + innerRef: o ref do pai chega ao <video>/<youtube-video-element>
// interno do ReactPlayer v3 (HTMLMediaElement). Sem isso playerRef.current
// fica null e o play dentro do gesto de clique nunca acontece.
const ClientReactPlayer = forwardRef<HTMLVideoElement, ClientProps>(
  function ClientReactPlayer({ innerRef, ...props }, ref) {
    const combined = (node: HTMLVideoElement | null) => {
      for (const target of [ref, innerRef]) {
        if (typeof target === "function") target(node);
        else if (target && typeof target === "object") (target as React.MutableRefObject<HTMLVideoElement | null>).current = node;
      }
    };
    return <ReactPlayer {...props} ref={combined} />;
  },
);

ClientReactPlayer.displayName = "ClientReactPlayer";

export default ClientReactPlayer;
