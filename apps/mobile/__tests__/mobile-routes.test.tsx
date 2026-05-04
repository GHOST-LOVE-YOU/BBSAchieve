import { renderRouter, screen } from "expo-router/testing-library";
import * as ExpoRouter from "expo-router";
import { fetchBoards } from "@/features/reading/client";

const appDir = "./src/app";

const originalWebBaseUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL;
const fetchMock = jest.fn<typeof fetch>();

function renderMobileRoute(initialUrl?: string) {
  return renderRouter(appDir, initialUrl ? { initialUrl } : undefined);
}

describe("mobile routes", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
    process.env.EXPO_PUBLIC_WEB_BASE_URL = "https://web.example.com";
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_WEB_BASE_URL = originalWebBaseUrl;
  });

  it("throws a clear error when EXPO_PUBLIC_WEB_BASE_URL is missing", async () => {
    delete process.env.EXPO_PUBLIC_WEB_BASE_URL;

    await expect(fetchBoards()).rejects.toThrow(
      "Missing EXPO_PUBLIC_WEB_BASE_URL for mobile public reading API",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders board entries on the home page from the public reading client", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        boards: [
          {
            id: "board:job",
            slug: "job",
            name: "Jobs and Offers",
            description: "Signals for roles, openings, and practical next steps.",
            threadCount: 2,
            latestThreadTitle: "First offer from the mirror",
          },
          {
            id: "board:hot",
            slug: "hot",
            name: "Hot Reading",
            description: "Popular mirrored discussions worth tracking.",
            threadCount: 4,
            latestThreadTitle: null,
          },
        ],
      }),
    } as Response);

    renderMobileRoute("/");

    expect(await screen.findByText("Jobs and Offers")).toBeTruthy();
    expect(screen.getByText("Hot Reading")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("https://web.example.com/api/public/boards");
  });

  it("renders board detail thread titles", async () => {
    renderMobileRoute("/boards/job");

    expect(await screen.findByText("First offer from the mirror")).toBeTruthy();
    expect(screen.getByText("Reading path for mirrored posts")).toBeTruthy();
  });

  it("renders thread detail body and replies", async () => {
    renderMobileRoute("/threads/first-offer");

    expect(await screen.findByText("A new listing has been mirrored and is ready to read.")).toBeTruthy();
    expect(screen.getByText("The mirror keeps the reading flow stable.")).toBeTruthy();
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
    renderMobileRoute("/threads/missing-thread");

    expect(await screen.findByText("帖子不存在")).toBeTruthy();
  });

  it("renders binding placeholder", async () => {
    renderMobileRoute("/inbox-binding");

    expect(screen.getByText("通知与绑定入口")).toBeTruthy();
  });
});
