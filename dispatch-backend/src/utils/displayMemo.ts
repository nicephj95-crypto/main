const MIGRATION_INTERNAL_MEMO_PATTERNS = [
  "[마이그레이션 미매핑]",
  "oldBaseYn=",
  "oldEmail=",
  "oldStartEnd=",
  "source=user_address",
  "reason=user_mapping_failed",
];

export function isMigrationInternalMemo(value: string | null | undefined) {
  const memo = value?.trim();
  if (!memo) return false;
  return MIGRATION_INTERNAL_MEMO_PATTERNS.some((pattern) => memo.includes(pattern));
}

export function sanitizeDisplayMemo(value: string | null | undefined) {
  const memo = value?.trim();
  if (!memo || isMigrationInternalMemo(memo)) return null;
  return memo;
}

export function collectDisplayMemos(values: Array<string | null | undefined>) {
  const memos: string[] = [];
  for (const value of values) {
    const memo = sanitizeDisplayMemo(value);
    if (memo && !memos.includes(memo)) {
      memos.push(memo);
    }
  }
  return memos.join("\n") || null;
}
