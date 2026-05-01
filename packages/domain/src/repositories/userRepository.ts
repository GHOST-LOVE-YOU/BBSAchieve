export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  userType: "human" | "bot";
  status: "active" | "disabled";
  mailboxKey?: string;
}

export interface UserRepository {
  findByUsername(username: string): Promise<UserRecord | null>;
  createBot(input: UserRecord): Promise<UserRecord>;
}
