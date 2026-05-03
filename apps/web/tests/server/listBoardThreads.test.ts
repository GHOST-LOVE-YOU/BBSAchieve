import { describe, expect, it, vi } from "vitest";

import { listBoardThreads } from "@/src/server/reading/listBoardThreads";

describe("listBoardThreads", () => {
  it("queries prisma with page-based pagination ordered by lastReplyAt desc and id desc", async () => {
    const count = vi.fn().mockResolvedValue(45);
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "thread:21",
        title: "Page 2 thread 1",
        lastReplyAt: new Date("2026-05-01T09:05:00.000Z"),
      },
      {
        id: "thread:22",
        title: "Page 2 thread 2",
        lastReplyAt: new Date("2026-05-01T08:10:00.000Z"),
      },
    ]);
    const client = {
      thread: {
        count,
        findMany,
      },
    } as any;

    const result = await listBoardThreads(
      { boardId: "board:job", boardSlug: "job", limit: 20, page: 2 },
      { client },
    );

    expect(count).toHaveBeenCalledWith({
      where: {
        boardId: "board:job",
      },
    });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        boardId: "board:job",
      },
      orderBy: [
        {
          lastReplyAt: {
            sort: "desc",
            nulls: "last",
          },
        },
        {
          id: "desc",
        },
      ],
      skip: 20,
      take: 20,
      select: {
        id: true,
        title: true,
        lastReplyAt: true,
      },
    });
    expect(result.threads.map((thread) => thread.id)).toEqual(["thread:21", "thread:22"]);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3);
    expect(result.totalCount).toBe(45);
    expect(result.hasPreviousPage).toBe(true);
    expect(result.hasNextPage).toBe(true);
  });

  it("clamps oversized page numbers to the last existing page", async () => {
    const count = vi.fn().mockResolvedValue(21);
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "thread:last",
          title: "Last page thread",
          lastReplyAt: null,
        },
      ]);
    const client = {
      thread: {
        count,
        findMany,
      },
    } as any;

    const result = await listBoardThreads(
      { boardId: "board:job", boardSlug: "job", limit: 20, page: 99 },
      { client },
    );

    expect(findMany).toHaveBeenNthCalledWith(1, {
      where: {
        boardId: "board:job",
      },
      orderBy: [
        {
          lastReplyAt: {
            sort: "desc",
            nulls: "last",
          },
        },
        {
          id: "desc",
        },
      ],
      skip: 1960,
      take: 20,
      select: {
        id: true,
        title: true,
        lastReplyAt: true,
      },
    });
    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: {
        boardId: "board:job",
      },
      orderBy: [
        {
          lastReplyAt: {
            sort: "desc",
            nulls: "last",
          },
        },
        {
          id: "desc",
        },
      ],
      skip: 20,
      take: 20,
      select: {
        id: true,
        title: true,
        lastReplyAt: true,
      },
    });
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.hasPreviousPage).toBe(true);
    expect(result.hasNextPage).toBe(false);
  });

  it("rejects invalid page values", async () => {
    await expect(
      listBoardThreads({
        boardId: "board:job",
        boardSlug: "job",
        limit: 20,
        page: 0,
      }),
    ).rejects.toThrow("Invalid thread page");
  });
});
