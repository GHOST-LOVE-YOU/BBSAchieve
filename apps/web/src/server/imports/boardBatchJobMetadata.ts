export type BoardBatchJobMetadata = {
  selectedBoardNames: string[];
  orderedBoardNames: string[];
  completedBoardNames: string[];
  currentBoardName: string | null;
  failedBoardName: string | null;
  currentBoardIndex: number;
  perBoardStats: Record<
    string,
    {
      processedThreads: number;
      processedReplies: number;
    }
  >;
};

function assertNonEmptyOrderedBoards(orderedBoardNames: string[]) {
  if (orderedBoardNames.length === 0) {
    throw new Error("orderedBoardNames must not be empty");
  }
}

function assertKnownBoard(metadata: BoardBatchJobMetadata, boardName: string) {
  if (!metadata.orderedBoardNames.includes(boardName)) {
    throw new Error(`board "${boardName}" is not in orderedBoardNames`);
  }
}

export function createBatchJobMetadata(input: {
  selectedBoardNames: string[];
  orderedBoardNames: string[];
}): BoardBatchJobMetadata {
  assertNonEmptyOrderedBoards(input.orderedBoardNames);

  return {
    selectedBoardNames: input.selectedBoardNames,
    orderedBoardNames: input.orderedBoardNames,
    completedBoardNames: [],
    currentBoardName: input.orderedBoardNames[0] ?? null,
    failedBoardName: null,
    currentBoardIndex: 0,
    perBoardStats: {},
  };
}

export function getCurrentBoardName(metadata: BoardBatchJobMetadata) {
  return metadata.currentBoardName;
}

export function markBoardCompleted(
  metadata: BoardBatchJobMetadata,
  input: {
    boardName: string;
    processedThreads: number;
    processedReplies: number;
  },
): BoardBatchJobMetadata {
  assertKnownBoard(metadata, input.boardName);

  if (metadata.completedBoardNames.includes(input.boardName)) {
    throw new Error(`board "${input.boardName}" is already completed`);
  }

  if (metadata.currentBoardName !== input.boardName) {
    throw new Error(
      `cannot complete board "${input.boardName}" while current board is "${metadata.currentBoardName}"`,
    );
  }

  const nextIndex = metadata.currentBoardIndex + 1;

  return {
    ...metadata,
    completedBoardNames: [...metadata.completedBoardNames, input.boardName],
    currentBoardIndex: nextIndex,
    currentBoardName: metadata.orderedBoardNames[nextIndex] ?? null,
    failedBoardName: null,
    perBoardStats: {
      ...metadata.perBoardStats,
      [input.boardName]: {
        processedThreads: input.processedThreads,
        processedReplies: input.processedReplies,
      },
    },
  };
}

export function markBoardFailed(
  metadata: BoardBatchJobMetadata,
  boardName: string,
): BoardBatchJobMetadata {
  assertKnownBoard(metadata, boardName);

  if (metadata.currentBoardName !== boardName) {
    throw new Error(
      `cannot fail board "${boardName}" while current board is "${metadata.currentBoardName}"`,
    );
  }

  return {
    ...metadata,
    currentBoardName: boardName,
    failedBoardName: boardName,
  };
}
