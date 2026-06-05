import { renderRouter, screen } from "expo-router/testing-library";
import * as ExpoRouter from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchBoards } from "@/features/reading/client";

const appDir = "./src/app";

const originalWebBaseUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL;
const originalKindeDomain = process.env.EXPO_PUBLIC_KINDE_DOMAIN;
const originalKindeClientId = process.env.EXPO_PUBLIC_KINDE_CLIENT_ID;
const originalKindeApiAudience = process.env.EXPO_PUBLIC_KINDE_API_AUDIENCE;
const originalKindeRedirectUrl = process.env.EXPO_PUBLIC_KINDE_REDIRECT_URL;
const fetchMock = jest.fn<typeof fetch>();
const authenticatedFetchOptions = {
  headers: {
    Authorization: "Bearer route-test-token",
  },
};

function renderMobileRoute(initialUrl?: string) {
  return renderRouter(appDir, initialUrl ? { initialUrl } : undefined);
}

describe("mobile routes", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    void AsyncStorage.clear();
    global.fetch = fetchMock as typeof fetch;
    process.env.EXPO_PUBLIC_WEB_BASE_URL = "https://web.example.com";
    process.env.EXPO_PUBLIC_KINDE_DOMAIN = "https://orlco.kinde.com";
    process.env.EXPO_PUBLIC_KINDE_CLIENT_ID = "mobile-client-id";
    process.env.EXPO_PUBLIC_KINDE_API_AUDIENCE = "https://bbsachieve.orlco/api";
    process.env.EXPO_PUBLIC_KINDE_REDIRECT_URL = "byrachieve://orlco.kinde.com/kinde_callback";
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_WEB_BASE_URL = originalWebBaseUrl;
    process.env.EXPO_PUBLIC_KINDE_DOMAIN = originalKindeDomain;
    process.env.EXPO_PUBLIC_KINDE_CLIENT_ID = originalKindeClientId;
    process.env.EXPO_PUBLIC_KINDE_API_AUDIENCE = originalKindeApiAudience;
    process.env.EXPO_PUBLIC_KINDE_REDIRECT_URL = originalKindeRedirectUrl;
  });

  it("throws a clear error when EXPO_PUBLIC_WEB_BASE_URL is missing", async () => {
    delete process.env.EXPO_PUBLIC_WEB_BASE_URL;

    await expect(fetchBoards()).rejects.toThrow(
      "Missing EXPO_PUBLIC_WEB_BASE_URL for mobile public reading API",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders feed entries on the home page from the public reading client", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "thread:first-offer",
            title: "First offer from the mirror",
            body: "A new listing has been mirrored and is ready to read.",
            excerpt: "A new listing has been mirrored.",
            authorId: "bot:alice",
            authorName: "Alice Bot",
            authorIsBot: true,
            publishedAt: "2026-05-04T00:00:00.000Z",
            lastReplyAt: "2026-05-04T01:00:00.000Z",
            lastReplyAuthorName: "Bob",
            replyCount: 2,
            boardId: "board:job",
            boardSlug: "job",
            boardName: "Jobs and Offers",
            sourceBoardSlug: "Job",
            sourceThreadId: "12345",
          },
          {
            id: "thread:hot-reading",
            title: "Hot reading from the mirror",
            body: "A popular discussion has been mirrored.",
            excerpt: "A popular discussion has been mirrored.",
            authorId: "bot:hot",
            authorName: "Hot Bot",
            authorIsBot: true,
            publishedAt: "2026-05-04T02:00:00.000Z",
            lastReplyAt: null,
            lastReplyAuthorName: null,
            replyCount: 4,
            boardId: "board:hot",
            boardSlug: "hot",
            boardName: "Hot Reading",
            sourceBoardSlug: "Hot",
            sourceThreadId: "67890",
          },
        ],
        page: 1,
        perPage: 15,
        totalCount: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      }),
    } as Response);

    renderMobileRoute("/");

    expect(await screen.findByText("First offer from the mirror")).toBeTruthy();
    expect(screen.getByText("Hot reading from the mirror")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://web.example.com/api/public/feed?kind=bot&page=1&perPage=15&sort=lastReply",
      authenticatedFetchOptions,
    );
  });

  it("renders board detail thread titles", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "board:job",
          slug: "job",
          name: "求职广场",
          description: "Reading path for mirrored posts",
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "thread:first-offer",
              title: "First offer from the mirror",
              authorName: "Alice",
              publishedAt: "2026-05-04T00:00:00.000Z",
              replyCount: 2,
              lastReplyAt: "2026-05-04T01:00:00.000Z",
            },
          ],
          page: {
            limit: 20,
            nextCursor: null,
            hasMore: false,
          },
        }),
      } as Response);

    renderMobileRoute("/boards/job");

    expect(await screen.findByText("First offer from the mirror")).toBeTruthy();
    expect(screen.getByText("Reading path for mirrored posts")).toBeTruthy();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://web.example.com/api/public/boards/job",
      authenticatedFetchOptions,
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://web.example.com/api/public/boards/job/threads?limit=20",
      authenticatedFetchOptions,
    );
  });

  it("renders thread detail body and replies", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          board: {
            id: "board:job",
            slug: "job",
            name: "求职广场",
          },
          thread: {
            id: "thread:first-offer",
            title: "First offer from the mirror",
            body: "A new listing has been mirrored and is ready to read.",
            authorName: "Alice",
            publishedAt: "2026-05-04T00:00:00.000Z",
            replyCount: 2,
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "reply:first",
              body: "The mirror keeps the reading flow stable.",
              authorName: "Bob",
              publishedAt: "2026-05-04T01:00:00.000Z",
              replyIndex: 1,
            },
          ],
          page: {
            limit: 20,
            nextCursor: null,
            hasMore: false,
          },
        }),
      } as Response);

    renderMobileRoute("/threads/first-offer");

    expect(await screen.findByText("A new listing has been mirrored and is ready to read.")).toBeTruthy();
    expect(screen.getByText("The mirror keeps the reading flow stable.")).toBeTruthy();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://web.example.com/api/public/threads/first-offer",
      authenticatedFetchOptions,
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://web.example.com/api/public/threads/first-offer/replies?limit=20",
      authenticatedFetchOptions,
    );
  });

  it("shows visible copy when the board route is missing its parameter", async () => {
    const useLocalSearchParamsMock = jest.spyOn(ExpoRouter, "useLocalSearchParams");
    useLocalSearchParamsMock.mockImplementation(() => ({ boardId: undefined } as any));

    try {
      renderMobileRoute("/boards/job");

      expect(await screen.findByText("版面不存在")).toBeTruthy();
    } finally {
      useLocalSearchParamsMock.mockRestore();
    }
  });

  it("shows visible copy when a thread does not exist", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);

    renderMobileRoute("/threads/missing-thread");

    expect(await screen.findByText("帖子不存在")).toBeTruthy();
  });

  it("shows visible copy when a board does not exist", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);

    renderMobileRoute("/boards/missing-board");

    expect(await screen.findByText("版面不存在")).toBeTruthy();
  });

  it("shows visible copy when initial board loading fails", async () => {
    fetchMock.mockRejectedValue(new Error("网络异常"));

    renderMobileRoute("/boards/job");

    expect(await screen.findByText("网络异常")).toBeTruthy();
  });

  it("shows visible copy when initial thread loading fails", async () => {
    fetchMock.mockRejectedValue(new Error("服务不可用"));

    renderMobileRoute("/threads/first-offer");

    expect(await screen.findByText("服务不可用")).toBeTruthy();
  });

  it("renders notification subscription placeholder", async () => {
    renderMobileRoute("/inbox-binding");

    expect(screen.getByText("通知订阅")).toBeTruthy();
    expect(screen.getByText("这里保留未来订阅镜像帖子或回复的入口。")).toBeTruthy();
  });
});
