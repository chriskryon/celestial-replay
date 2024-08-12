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
    const stacks: Stack[] = [];

    if (typeof window !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key) {
          const stack = this.getStack(key);

          if (stack) {
            stacks.push(stack);
          }
        }
      }
    }

    return stacks;
  }

  deleteStack(stackId: string): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(stackId);
    }
  }
}
