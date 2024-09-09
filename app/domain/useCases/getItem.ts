import { StackRepository } from "../ports/stackRepository";
import { Stack } from "../stack";

export function getItem(
  stackId: string,
  repository: StackRepository,
): Stack | null {
  return Stack.getStack(stackId, repository);
}
