"use client";

import { useState } from "react";

import type {
  BoardCatalogEntry,
  BoardCatalogSection,
} from "@/src/server/boardSync/boardCatalog";

type BoardSectionSelectorProps = {
  sections: readonly BoardCatalogSection[];
  orderedBoards: readonly BoardCatalogEntry[];
};

export function BoardSectionSelector({
  sections,
  orderedBoards,
}: BoardSectionSelectorProps) {
  const [selectedBoardNames, setSelectedBoardNames] = useState<string[]>([]);

  function toggleBoard(boardName: string, checked: boolean) {
    setSelectedBoardNames((current) => {
      if (checked) {
        return current.includes(boardName) ? current : [...current, boardName];
      }
      return current.filter((name) => name !== boardName);
    });
  }

  function selectSection(section: BoardCatalogSection) {
    const boardNames = section.boards
      .filter((board) => board.fullSyncEnabled)
      .map((board) => board.boardName);
    setSelectedBoardNames((current) => {
      const next = new Set(current);
      for (const boardName of boardNames) {
        next.add(boardName);
      }
      return [...next];
    });
  }

  function clearSection(section: BoardCatalogSection) {
    const boardNames = new Set(
      section.boards
        .filter((board) => board.fullSyncEnabled)
        .map((board) => board.boardName),
    );
    setSelectedBoardNames((current) =>
      current.filter((boardName) => !boardNames.has(boardName)),
    );
  }

  return (
    <>
      <p className="text-sm text-zinc-500">以下目录来自首页固化板块清单</p>
      <div className="grid gap-4">
        {sections.map((section) => (
          <section
            key={section.sectionSlug}
            className="rounded-xl border border-zinc-200 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-900">{section.sectionName}</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900"
                  onClick={() => selectSection(section)}
                >
                  全选本分区
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900"
                  onClick={() => clearSection(section)}
                >
                  取消本分区
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-3">
              {section.boards
                .filter((board) => board.fullSyncEnabled)
                .map((board) => {
                  const checked = selectedBoardNames.includes(board.boardName);
                  return (
                    <div
                      key={board.boardName}
                      className="flex items-start gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    >
                      <input
                        id={`board-${board.boardSlug}`}
                        type="checkbox"
                        name="boardNames"
                        value={board.boardName}
                        checked={checked}
                        onChange={(event) => toggleBoard(board.boardName, event.target.checked)}
                        className="mt-0.5"
                        aria-describedby={`board-${board.boardSlug}-description`}
                      />
                      <span className="grid gap-1">
                        <label
                          htmlFor={`board-${board.boardSlug}`}
                          className="font-medium text-zinc-900"
                        >
                          {board.title}
                        </label>
                        <span
                          id={`board-${board.boardSlug}-description`}
                          className="text-zinc-500"
                        >
                          {board.description}
                        </span>
                      </span>
                    </div>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-3 text-sm text-zinc-500">
        只会抓取已勾选板块，执行顺序按首页目录顺序。
      </p>
      <p className="mt-1 text-sm text-zinc-500">当前已选择 {selectedBoardNames.length} 个板块</p>
      <p className="mt-1 text-sm text-zinc-500">
        当前将按首页目录顺序串行抓取：
        {orderedBoards.map((board) => board.title).join("、")}
      </p>
    </>
  );
}
