import { beforeEach, describe, expect, it, vi } from "vitest";

const publicReadingServiceMock = vi.hoisted(() => ({
  listBoards: vi.fn(),
  getBoard: vi.fn(),
  getBoardThreadsFeed: vi.fn(),
  getThread: vi.fn(),
  getThreadRepliesFeed: vi.fn(),
}));

vi.mock("@/src/server/reading/publicReadingService", () => ({
  createPublicReadingService: () => publicReadingServiceMock,
}));

import { GET as getBoards } from "../app/api/public/boards/route";
import { GET as getBoard } from "../app/api/public/boards/[boardIdOrSlug]/route";
import { GET as getBoardThreadsFeed } from "../app/api/public/boards/[boardIdOrSlug]/threads/route";
import { GET as getThread } from "../app/api/public/threads/[threadId]/route";
import { GET as getThreadRepliesFeed } from "../app/api/public/threads/[threadId]/replies/route";

describe("public api routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns boards as anonymous json", async () => {
    publicReadingServiceMock.listBoards.mockResolvedValue({
      boards: [
        {
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
          threadCount: 2,
          latestThreadTitle: "Newest thread",
        },
      ],
    });

    const response = await getBoards(
      new Request("http://localhost/api/public/boards"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      boards: [
        {
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
          threadCount: 2,
          latestThreadTitle: "Newest thread",
        },
      ],
    });
  });

  it("returns 404 when board detail is missing", async () => {
    publicReadingServiceMock.getBoard.mockResolvedValue(null);

    const response = await getBoard(
      new Request("http://localhost/api/public/boards/missing"),
      {
        params: Promise.resolve({ boardIdOrSlug: "missing" }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Board not found",
    });
  });

  it("returns 400 when thread feed limit is invalid", async () => {
    publicReadingServiceMock.getBoardThreadsFeed.mockRejectedValueOnce(
      new Error("Invalid limit"),
    );

    const response = await getBoardThreadsFeed(
      new Request("http://localhost/api/public/boards/job/threads?limit=21"),
      { params: Promise.resolve({ boardIdOrSlug: "job" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid limit" });
  });

  it("returns thread detail json", async () => {
    publicReadingServiceMock.getThread.mockResolvedValue({
      board: {
        id: "board:job",
        slug: "job",
        name: "Jobs and Offers",
      },
      thread: {
        id: "thread:first-offer",
        title: "First offer from the mirror",
        body: "A new listing has been mirrored and is ready to read.",
        authorName: "Robot 1",
        publishedAt: "2026-05-01T08:00:00.000Z",
        replyCount: 2,
      },
    });

    const response = await getThread(
      new Request("http://localhost/api/public/threads/first-offer"),
      { params: Promise.resolve({ threadId: "first-offer" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      board: {
        id: "board:job",
        slug: "job",
        name: "Jobs and Offers",
      },
      thread: {
        id: "thread:first-offer",
        title: "First offer from the mirror",
        body: "A new listing has been mirrored and is ready to read.",
        authorName: "Robot 1",
        publishedAt: "2026-05-01T08:00:00.000Z",
        replyCount: 2,
      },
    });
  });

  it("returns 404 when thread replies feed is missing", async () => {
    publicReadingServiceMock.getThreadRepliesFeed.mockResolvedValue(null);

    const response = await getThreadRepliesFeed(
      new Request("http://localhost/api/public/threads/missing/replies?limit=20"),
      { params: Promise.resolve({ threadId: "missing" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Thread not found",
    });
  });
});
