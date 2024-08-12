import { StackRepository } from "../ports/stackRepository";
import { Stack } from "../stack";

export function listStacks(
  repository: StackRepository,
  includeNameWithoutKey?: boolean,
): Stack[] {
  const stacks = Stack.getAllStacks(repository);

  if (includeNameWithoutKey) {
    return stacks.map((stack) => {
      const newStack = new Stack(
        stack.name,
        stack.videos,
        stack.getRepository(),
      );

      (newStack as any).nameWithoutKey = stack.name.split("-")[0];

      return newStack;
    });
  } else {
    return stacks;
  }
}
