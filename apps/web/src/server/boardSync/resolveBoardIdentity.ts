import { boardCatalog } from "./boardCatalog";

const DEFAULT_BOARD_SLUG = "iwhisper";
const DEFAULT_BOARD_NAME = "IWhisper";

export type ResolvedBoardIdentity = {
  slug: string;
  name: string;
};

export function resolveBoardIdentity(boardName: string): ResolvedBoardIdentity {
  const trimmed = boardName.trim();
  if (trimmed.length === 0) {
    return {
      slug: DEFAULT_BOARD_SLUG,
      name: DEFAULT_BOARD_NAME,
    };
  }

  const matchedBoard =
    boardCatalog.find((board) => board.boardName === trimmed) ??
    boardCatalog.find((board) => board.boardSlug === trimmed);
  if (matchedBoard) {
    return {
      slug: matchedBoard.boardSlug,
      name: matchedBoard.boardName,
    };
  }

  return {
    slug: trimmed.toLowerCase(),
    name: trimmed,
  };
}
