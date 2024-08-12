/* eslint-disable no-console */
import { z } from "zod";

import { StackRepository } from "./ports/stackRepository";
import { Video } from "./video";

const videoSchema = z.object({
  url: z.string().url(),
  repetitions: z.number().int().min(0),
});

export class Stack {
  name: string;
  videos: Video[];
  private repository: StackRepository;

  constructor(name: string, videos: Video[], repository: StackRepository) {
    this.name = name;
    this.videos = videos;
    this.repository = repository;
  }

  addVideo(url: string, repetitions: number): boolean {
    try {
      videoSchema.parse({ url, repetitions });
      this.videos.push({ url, repetitions });
      this.save();

      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(
          "Erro de validação ao adicionar vídeo:",
          error.issues[0].message,
        );
      }

      return false;
    }
  }

  editVideo(
    index: number,
    newUrl: string | null,
    newRepetitions: number | null,
  ): boolean {
    if (index >= 0 && index < this.videos.length) {
      if (newUrl !== null) {
        this.videos[index].url = newUrl;
      }
      if (newRepetitions !== null) {
        this.videos[index].repetitions = newRepetitions;
      }

      this.save();

      return true;
    } else {
      console.error("Índice de vídeo inválido.");

      return false;
    }
  }

  deleteVideo(index: number): boolean {
    if (index >= 0 && index < this.videos.length) {
      this.videos.splice(index, 1);
      this.save();

      return true;
    } else {
      console.error("Índice de vídeo inválido.");

      return false;
    }
  }

  /**
   * Obtém uma stack do armazenamento pelo seu ID.
   * @param stackId - O ID da stack a ser carregada.
   * @param repository - O repositório de stacks.
   * @returns Uma instância de Stack se a stack for encontrada e válida, `null` caso contrário.
   */
  static getStack(stackId: string, repository: StackRepository): Stack | null {
    const storedData = repository.getStack(stackId);

    if (storedData) {
      try {
        const parsedVideos = JSON.parse(
          JSON.stringify(storedData.videos),
        ) as Video[];

        z.array(videoSchema).parse(parsedVideos);

        return new Stack(stackId, parsedVideos, repository);
      } catch (error) {
        console.error("Erro ao carregar a stack do armazenamento:", error);

        return null;
      }
    }

    return null;
  }

  /**
   * Obtém todas as stacks do armazenamento.
   * @param repository - O repositório de stacks.
   * @returns Um array de objetos Stack representando todas as stacks carregadas.
   */
  static getAllStacks(repository: StackRepository): Stack[] {
    // Usa o método getAllStacks do repositório
    const storedStacks = repository.getAllStacks();

    // Valida cada stack carregada e cria instâncias de Stack
    const stacks: Stack[] = [];

    for (const storedStack of storedStacks) {
      try {
        z.array(videoSchema).parse(storedStack.videos);
        const stack = new Stack(
          storedStack.name,
          storedStack.videos,
          repository,
        );

        stacks.push(stack);
      } catch (error) {
        console.error(`Dados inválidos na stack ${storedStack.name}`);
      }
    }

    return stacks;
  }

  /**
   * Exclui a stack do armazenamento.
   * @returns `true` se a stack foi excluída com sucesso, `false` caso contrário.
   */
  delete(): boolean {
    if (typeof window !== "undefined") {
      this.repository.deleteStack(this.name);

      return true;
    } else {
      console.error("Ambiente não é o navegador.");

      return false;
    }
  }

  public save() {
    this.repository.saveStack(this);
  }

  public getRepository(): StackRepository {
    return this.repository;
  }
}
