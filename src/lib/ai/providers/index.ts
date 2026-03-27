import { AiProvider } from "./base";
import { DoubaoProvider } from "./doubao";

export function getAiProvider(provider: string): AiProvider {
  // 目前只有一个实现，后续可按需扩展。
  switch (provider) {
    case "doubao":
    default:
      return new DoubaoProvider();
  }
}

