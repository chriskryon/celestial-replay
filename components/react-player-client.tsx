"use client";

import { type ComponentProps } from "react";
import ReactPlayer from "react-player";

type PlayerProps = ComponentProps<typeof ReactPlayer>;

export default function ClientReactPlayer({ playerRef, ...props }: PlayerProps & { playerRef?: any }) {
  return <ReactPlayer {...props} ref={playerRef} />;
}
