export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  userType: "human" | "bot";
  status: "active" | "disabled";
  mailboxKey?: string;
  sourceLabel?: string;
  canPost?: boolean;
}

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  createBot(input: UserRecord): Promise<UserRecord>;
}
