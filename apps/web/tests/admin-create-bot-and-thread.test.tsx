import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  InMemoryThreadRepository,
  InMemoryUserRepository,
} from "@bbs/test-utils";
import { AdminThreadForm } from "../src/features/admin/ThreadForm";

describe("admin create thread flow", () => {
  it("creates missing bot before saving thread", async () => {
    const users = new InMemoryUserRepository();
    const threads = new InMemoryThreadRepository();

    render(<AdminThreadForm users={users} threads={threads} />);

    await userEvent.type(screen.getByLabelText("机器人用户名"), "robot-b");
    await userEvent.type(screen.getByLabelText("机器人显示名"), "机器人 B");
    await userEvent.type(screen.getByLabelText("收件箱键"), "mailbox-b");
    await userEvent.type(screen.getByLabelText("帖子标题"), "标题 B");
    await userEvent.type(screen.getByLabelText("帖子正文"), "正文 B");
    await userEvent.click(screen.getByRole("button", { name: "保存帖子" }));

    expect(await users.findByUsername("robot-b")).not.toBeNull();
    expect((await threads.listByBoard("board-default"))[0]?.title).toBe("标题 B");
  });
});
