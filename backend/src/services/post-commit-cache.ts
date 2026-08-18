export type PostCommitLoadResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: unknown };

export async function loadAfterCommit<T>(load: () => Promise<T>): Promise<PostCommitLoadResult<T>> {
  try {
    return { ok: true, data: await load() };
  } catch (error) {
    return { ok: false, error };
  }
}
