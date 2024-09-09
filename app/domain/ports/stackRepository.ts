import { Stack } from "../stack";

export interface StackRepository {
  saveStack(stack: Stack): void;
  getStack(stackId: string): Stack | null;
  getAllStacks(): Stack[];
  deleteStack(stackId: string): void;
}
