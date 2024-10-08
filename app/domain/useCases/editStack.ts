/* eslint-disable no-console */
// domain/useCases/editStack.ts

import { z } from "zod";

import { StackRepository } from "../ports/stackRepository";
import { Video } from "../video";

const videoSchema = z.object({
  url: z.string().url(),
  repetitions: z.number().int().min(0),
});

export function editStack(
  stackId: string,
  url: string,
  newUrl: string | null,
  repetitions: number,
  newRepetitions: number | null,
  repository: StackRepository,
): { success: boolean; error?: string; updatedVideos?: Video[] } {
  const stack = repository.getStack(stackId);

  if (!stack) {
    return { success: false, error: "Stack not found" };
  }

  const videoIndex = stack.videos.findIndex((video) => video.url === url);

  if (videoIndex === -1) {
    return { success: false, error: "URL not found in stack" };
  }

  if (
    newUrl === stack.videos[videoIndex].url &&
    newRepetitions === stack.videos[videoIndex].repetitions
  ) {
    return {
      success: false,
      error: "New URL or repetitions are the same as the old ones",
    };
  }

  try {
    if (newUrl !== null) {
      videoSchema.parse({
        url: newUrl,
        repetitions: stack.videos[videoIndex].repetitions,
      });
    }
    if (newRepetitions !== null) {
      videoSchema.parse({
        url: stack.videos[videoIndex].url,
        repetitions: newRepetitions,
      });
    }

    const success = stack.editVideo(
      videoIndex,
      newUrl ?? url,
      newRepetitions ?? repetitions,
    );

    if (success) {
      stack.save();

      return { success: true, updatedVideos: stack.videos };
    } else {
      return { success: false, error: "Failed to edit video in stack" };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod validation error:", error.issues[0].message);

      return { success: false, error: error.issues[0].message };
    } else {
      console.error("Error editing stack:", error);

      return { success: false, error: "Error editing stack" };
    }
  }
}
