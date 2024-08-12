import { StackRepository } from "../ports/stackRepository";
import { Stack } from "../stack";

export function deleteVideoFromStack(
  stackId: string,
  videoIndex: number,
  repository: StackRepository,
): {
  success: boolean;
  updatedData?: { url: string; repetitions: number }[];
  stackDeleted?: boolean;
  error?: string;
} {
  const stack = Stack.getStack(stackId, repository);

  if (stack) {
    const success = stack.deleteVideo(videoIndex);

    if (success) {
      if (stack.videos.length === 0) {
        repository.deleteStack(stackId);

        return { success: true, stackDeleted: true };
      } else {
        stack.save();

        return { success: true, updatedData: stack.videos };
      }
    } else {
      return { success: false, error: "Failed to delete video from stack" };
    }
  } else {
    return { success: false, error: "Stack not found" };
  }
}
