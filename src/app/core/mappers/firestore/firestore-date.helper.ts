export type FirestoreDateValue =
  | string
  | Date
  | { toDate(): Date }
  | { seconds: number; nanoseconds: number };

export function normalizeFirestoreDate(
  value: FirestoreDateValue | undefined,
  fallback: string = new Date().toISOString(),
): string {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if ('toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if ('seconds' in value) {
    return new Date(value.seconds * 1000).toISOString();
  }

  return fallback;
}
