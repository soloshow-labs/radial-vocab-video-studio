export class PublicError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode: number,
  ) {
    super(code);
    this.name = "PublicError";
  }
}
export function publicErrorBody(error: unknown): {error: {code: string}} {
  if (error instanceof PublicError) return {error: {code: error.code}};
  return {error: {code: "internal_error"}};
}
