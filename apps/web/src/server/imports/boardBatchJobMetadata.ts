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

export function createBatchJobMetadata(input: {
  selectedBoardNames: string[];
  orderedBoardNames: string[];
}): BoardBatchJobMetadata {
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
  return {
    ...metadata,
    currentBoardName: boardName,
    failedBoardName: boardName,
  };
}
