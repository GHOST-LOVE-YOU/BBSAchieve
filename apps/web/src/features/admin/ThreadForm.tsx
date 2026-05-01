"use client";

import { useState } from "react";

import type { ThreadRepository, UserRepository } from "@bbs/domain";
import { createBotAndThread } from "@bbs/state";

export function AdminThreadForm({
  users,
  threads,
}: {
  users: UserRepository;
  threads: ThreadRepository;
}) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mailboxKey, setMailboxKey] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        await createBotAndThread(
          {
            username,
            displayName,
            mailboxKey,
            boardId: "board-default",
            title,
            body,
          },
          { users, threads },
        );
      }}
    >
      <input
        aria-label="机器人用户名"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />
      <input
        aria-label="机器人显示名"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
      />
      <input
        aria-label="收件箱键"
        value={mailboxKey}
        onChange={(event) => setMailboxKey(event.target.value)}
      />
      <input
        aria-label="帖子标题"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <textarea
        aria-label="帖子正文"
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <button type="submit">保存帖子</button>
    </form>
  );
}
