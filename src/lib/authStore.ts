// Tiny module-level holder for the current user id so the (non-React) data layer
// in progress.ts can decide between Supabase and localStorage without prop drilling.
// Kept in sync by the AuthProvider.

let _userId: string | null = null;

export function setCurrentUserId(id: string | null): void {
  _userId = id;
}

export function currentUserId(): string | null {
  return _userId;
}
