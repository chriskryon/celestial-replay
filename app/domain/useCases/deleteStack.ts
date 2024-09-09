/* eslint-disable no-console */
import { StackRepository } from "../ports/stackRepository";

export function deleteStack(
  stackId: string,
  repository: StackRepository,
): { success: boolean; error?: string } {
  if (typeof window !== "undefined") {
    repository.deleteStack(stackId);

    return { success: true };
  } else {
    console.error("Ambiente não é o navegador.");

    return { success: false, error: "Environment is not the browser" };
  }
}
