export type LegacyUserRow = {
  id: string;
  name: string;
  tag: string | null;
};

export type LegacyPostRow = {
  id: string;
  byr_id: string | null;
  topic: string;
  area: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

export type LegacyCommentRow = {
  id: string;
  sequence: number;
  content: string | null;
  time: Date;
  postId: string;
  userId: string;
};

export type LegacyImportRows = {
  posts: LegacyPostRow[];
  comments: LegacyCommentRow[];
  users: LegacyUserRow[];
};
