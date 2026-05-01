import { renderRouter, screen } from "expo-router/testing-library";

describe("mobile routes", () => {
  it("renders board entries on the home page", async () => {
    renderRouter({
      index: require("../src/app/index").default,
      "boards/[boardId]": require("../src/app/boards/[boardId]").default,
      "threads/[threadId]": require("../src/app/threads/[threadId]").default,
      "inbox-binding": require("../src/app/inbox-binding").default,
    });

    expect(await screen.findByText("Jobs and Offers")).toBeTruthy();
    expect(screen.getByText("Hot Reading")).toBeTruthy();
  });

  it("renders board detail thread titles", async () => {
    renderRouter({
      index: require("../src/app/index").default,
      "boards/[boardId]": require("../src/app/boards/[boardId]").default,
      "threads/[threadId]": require("../src/app/threads/[threadId]").default,
      "inbox-binding": require("../src/app/inbox-binding").default,
    }, {
      initialUrl: "/boards/board:job",
    });

    expect(await screen.findByText("First offer from the mirror")).toBeTruthy();
    expect(screen.getByText("Reading path for mirrored posts")).toBeTruthy();
  });

  it("renders thread detail body and replies", async () => {
    renderRouter({
      index: require("../src/app/index").default,
      "boards/[boardId]": require("../src/app/boards/[boardId]").default,
      "threads/[threadId]": require("../src/app/threads/[threadId]").default,
      "inbox-binding": require("../src/app/inbox-binding").default,
    }, {
      initialUrl: "/threads/thread:first-offer",
    });

    expect(await screen.findByText("A new listing has been mirrored and is ready to read.")).toBeTruthy();
    expect(screen.getByText("The mirror keeps the reading flow stable.")).toBeTruthy();
  });

  it("renders binding placeholder", async () => {
    renderRouter({
      index: require("../src/app/index").default,
      "boards/[boardId]": require("../src/app/boards/[boardId]").default,
      "threads/[threadId]": require("../src/app/threads/[threadId]").default,
      "inbox-binding": require("../src/app/inbox-binding").default,
    }, {
      initialUrl: "/inbox-binding",
    });

    expect(screen.getByText("通知与绑定入口")).toBeTruthy();
  });
});
