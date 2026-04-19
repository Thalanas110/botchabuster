import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AIChatbot } from "./AIChatbot";

describe("AIChatbot", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("uses a viewport-clamped mobile window when opened", async () => {
    await act(async () => {
      root.render(<AIChatbot />);
    });

    const openButton = container.querySelector('[aria-label="Open AI chat"]');
    if (!(openButton instanceof HTMLButtonElement)) {
      throw new Error("Open chat button not found");
    }

    await act(async () => {
      openButton.click();
    });

    const chatWindow = container.querySelector('[data-testid="ai-chat-window"]');
    if (!(chatWindow instanceof HTMLDivElement)) {
      throw new Error("Chat window not found");
    }

    expect(chatWindow.className).toContain("left-3");
    expect(chatWindow.className).toContain("right-3");
    expect(chatWindow.className).toContain("w-[calc(100vw-1.5rem)]");
    expect(chatWindow.className).toContain("max-w-[380px]");
  });
});
