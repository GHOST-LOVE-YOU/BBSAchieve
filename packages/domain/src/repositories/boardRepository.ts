export interface BoardRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface BoardRepository {
  findById(id: string): Promise<BoardRecord | null>;
  findBySlug(slug: string): Promise<BoardRecord | null>;
  list(): Promise<BoardRecord[]>;
}
