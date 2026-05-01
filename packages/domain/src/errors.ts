export type DomainErrorCode =
  | "AUTHOR_NOT_FOUND"
  | "USERNAME_CONFLICT"
  | "ENTITY_SOFT_DELETED"
  | "IMPORT_VALIDATION_FAILED"
  | "UNAUTHORIZED_ADMIN_ACCESS";

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
