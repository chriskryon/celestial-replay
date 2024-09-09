/* eslint-disable no-console */
import { nanoid } from "nanoid";
import { z } from "zod";

import { Stack } from "../stack";
import { StackRepository } from "../ports/stackRepository";
import generateNanoid from "@/app/utils/generateId";

const videoSchema = z.object({
  url: z.string().url(),
  repetitions: z
    .number()
    .int()
    .min(1, { message: "Repetitions must be at least 1" }),
});

export function createStack(
  stackName: string,
  videoInput: string,
  repository: StackRepository,
): { success: boolean; stack?: Stack; error?: string } {
  try {
    const parsedVideos = videoInput
      .split("\n")
      .filter(Boolean)
      .map((video) => {
        const [url, repetitionsStr] = video.split(";");

        return { url, repetitions: parseInt(repetitionsStr, 10) };
      });
    const validatedVideos = z.array(videoSchema).parse(parsedVideos);

    const groupedVideos = validatedVideos.reduce(
      (acc, video) => {
        if (acc[video.url]) {
          acc[video.url].repetitions += video.repetitions;
        } else {
          acc[video.url] = video;
        }

        return acc;
      },
      {} as { [url: string]: { url: string; repetitions: number } },
    );

    const uniqueVideos = Object.values(groupedVideos);

    const stackId = `${stackName}-${generateNanoid()}`;
    const newStack = new Stack(stackId, uniqueVideos, repository);

    newStack.save();

    return { success: true, stack: newStack };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Erro de validação Zod:", error.issues[0].message);

      return { success: false, error: error.issues[0].message };
    } else {
      console.error("Erro ao criar a stack:", error);

      return { success: false, error: "Error creating stack" };
    }
  }
}
