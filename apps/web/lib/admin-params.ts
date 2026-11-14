/** Reads ?status= (only known values) and ?page= (a positive whole number) from admin list URLs. */
export function listParams<S extends string>(
  query: Record<string, string | string[] | undefined>, statuses: readonly S[],
): { status: S | undefined; page: number } {
  const status = statuses.find((s) => s === query.status);
  const page = Number(query.page);
  return { status, page: Number.isInteger(page) && page > 0 ? page : 1 };
}
