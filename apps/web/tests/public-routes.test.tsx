import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  },
}));

const nextNavigation = vi.hoisted(() => {
  const error = Object.assign(new Error("NEXT_NOT_FOUND"), {
    digest: "NEXT_NOT_FOUND",
  });

  return {
    error,
    notFound: vi.fn(() => {
      throw error;
    }),
  };
});

vi.mock("next/navigation", () => ({
  notFound: nextNavigation.notFound,
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

  it("calls notFound for missing board or thread", async () => {
    nextNavigation.notFound.mockClear();

    await expect(
      BoardPage({
        params: Promise.resolve({ boardId: "missing-board" }),
      }),
    ).rejects.toThrow(nextNavigation.error);

    await expect(
      ThreadPage({
        params: Promise.resolve({ threadId: "missing-thread" }),
      }),
    ).rejects.toThrow(nextNavigation.error);

    expect(nextNavigation.notFound).toHaveBeenCalledTimes(2);
  });
});
