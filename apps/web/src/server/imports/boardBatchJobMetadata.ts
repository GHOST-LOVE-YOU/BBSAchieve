export type BoardBatchJobMetadata = {
  selectedBoardNames: string[];
  orderedBoardNames: string[];
  completedBoardNames: string[];
  currentBoardName: string | null;
  failedBoardName: string | null;
  currentBoardIndex: number;
  currentBoardPageByName?: Record<string, number>;
  perBoardStats: Record<
    string,
    {
      processedThreads: number;
      processedReplies: number;
      skippedThreads?: number;
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
    currentBoardPageByName: {},
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
    skippedThreads?: number;
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
        ...(input.skippedThreads
          ? { skippedThreads: input.skippedThreads }
          : {}),
      },
    },
  };
}

export function getCurrentBoardPage(
  metadata: BoardBatchJobMetadata,
  boardName: string,
) {
  assertKnownBoard(metadata, boardName);
  return metadata.currentBoardPageByName?.[boardName] ?? 1;
}

export function markBoardPageCompleted(
  metadata: BoardBatchJobMetadata,
  input: {
    boardName: string;
    nextPage: number;
    processedThreads: number;
    processedReplies: number;
    skippedThreads?: number;
  },
): BoardBatchJobMetadata {
  assertKnownBoard(metadata, input.boardName);

  if (metadata.currentBoardName !== input.boardName) {
    throw new Error(
      `cannot update board "${input.boardName}" while current board is "${metadata.currentBoardName}"`,
    );
  }

  const currentStats = metadata.perBoardStats[input.boardName] ?? {
    processedThreads: 0,
    processedReplies: 0,
  };

  return {
    ...metadata,
    failedBoardName: null,
    currentBoardPageByName: {
      ...(metadata.currentBoardPageByName ?? {}),
      [input.boardName]: input.nextPage,
    },
    perBoardStats: {
      ...metadata.perBoardStats,
      [input.boardName]: {
        processedThreads: currentStats.processedThreads + input.processedThreads,
        processedReplies: currentStats.processedReplies + input.processedReplies,
        ...((currentStats.skippedThreads ?? 0) + (input.skippedThreads ?? 0) > 0
          ? {
              skippedThreads:
                (currentStats.skippedThreads ?? 0) + (input.skippedThreads ?? 0),
            }
          : {}),
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
