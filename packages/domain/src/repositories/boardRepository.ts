export interface BoardRecord {
  id: string;
  name: string;
  description: string;
}

export interface BoardRepository {
  findById(id: string): Promise<BoardRecord | null>;
  list(): Promise<BoardRecord[]>;
}
