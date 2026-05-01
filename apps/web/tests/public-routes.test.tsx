import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BoardPage from "../app/boards/[boardId]/page";
import HomePage from "../app/page";

describe("web public routes", () => {
  it("renders forum home", () => {
    render(<HomePage />);
    expect(screen.getByText("论坛首页")).toBeTruthy();
  });

  it("renders board page", async () => {
    const ui = await BoardPage();
    render(ui);
    expect(screen.getByText("版面帖子")).toBeTruthy();
  });
});
