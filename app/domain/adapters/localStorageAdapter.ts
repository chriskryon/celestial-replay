/* eslint-disable no-console */
import { z } from "zod";

import { StackRepository } from "../ports/stackRepository";
import { Stack } from "../stack";
import { Video } from "../video";

const videoSchema = z.object({
  url: z.string().url(),
  repetitions: z.number().int().min(0),
});

export class LocalStorageAdapter implements StackRepository {
  saveStack(stack: Stack): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(stack.name, JSON.stringify(stack.videos));
    }
  }

  getStack(stackId: string): Stack | null {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem(stackId);

      if (storedData) {
        try {
          const parsedVideos = JSON.parse(storedData) as Video[];

          z.array(videoSchema).parse(parsedVideos);

          return new Stack(stackId, parsedVideos, this);
        } catch (error) {
          console.error("Erro ao carregar a stack do localStorage:", error);

          return null;
        }
      }
    }

    return null;
  }

  getAllStacks(): Stack[] {
    if (typeof window !== "undefined") {
      return Object.entries(window.localStorage)
        .filter(([key, value]) => {
          try {
            const parsedValue = JSON.parse(value);

            return (
              Array.isArray(parsedValue) &&
              parsedValue.every(
                (item) =>
                  typeof item === "object" &&
                  "url" in item &&
                  "repetitions" in item,
              )
            );
          } catch (error) {
            return false;
          }
        })
        .map(([stackId, stackValue]) => {
          const parsedVideos = JSON.parse(stackValue) as Video[];

          return new Stack(stackId, parsedVideos, this);
        });
    } else {
      return [];
    }
  }

  deleteStack(stackId: string): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(stackId);
    }
  }
}
