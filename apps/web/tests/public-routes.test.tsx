import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  },
}));

import BoardPage from "../app/boards/[boardId]/page";
import HomePage from "../app/page";
import ThreadPage from "../app/threads/[threadId]/page";

describe("web public routes", () => {
  it("renders board entries on the home page", async () => {
    render(await HomePage());
    expect(screen.getByText("Jobs and Offers")).toBeTruthy();
    expect(screen.getByText("Hot Reading")).toBeTruthy();
  });

  it("renders board detail and thread summaries", async () => {
    const ui = await BoardPage({
      params: Promise.resolve({ boardId: "board:job" }),
    });
    render(ui);
    expect(screen.getByText("First offer from the mirror")).toBeTruthy();
    expect(screen.getByText("Reading path for mirrored posts")).toBeTruthy();
  });

  it("renders thread detail and replies", async () => {
    const ui = await ThreadPage({
      params: Promise.resolve({ threadId: "thread:first-offer" }),
    });
    render(ui);
    expect(screen.getByText("A new listing has been mirrored and is ready to read.")).toBeTruthy();
    expect(screen.getByText("The mirror keeps the reading flow stable.")).toBeTruthy();
  });
});
