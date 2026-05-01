import { renderRouter, screen } from "expo-router/testing-library";

describe("mobile routes", () => {
  it("renders board list entry", async () => {
    renderRouter({
      index: require("../src/app/index").default,
      "inbox-binding": require("../src/app/inbox-binding").default,
    });

    expect(screen.getByText("移动端版面列表")).toBeTruthy();
  });

  it("renders binding placeholder", async () => {
    renderRouter({
      index: require("../src/app/index").default,
      "inbox-binding": require("../src/app/inbox-binding").default,
    }, {
      initialUrl: "/inbox-binding",
    });

    expect(screen.getByText("通知与绑定入口")).toBeTruthy();
  });
});
