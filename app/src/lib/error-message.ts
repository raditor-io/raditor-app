/**
 * Extract a human-readable message from any thrown value. Supabase's
 * PostgrestError is a plain object (NOT an Error instance), so bare
 * `err instanceof Error` checks swallow the real cause behind generic
 * fallbacks — always use this in action catch blocks.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string" &&
    (err as { message: string }).message.length > 0
  ) {
    return (err as { message: string }).message;
  }
  return fallback;
}
