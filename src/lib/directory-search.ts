/** Persian names and personnel codes should match regardless of keyboard. */
export function normalizeDirectorySearch(value: string): string {
  return value.normalize("NFKC").toLowerCase()
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\s\u200c\u200d\u064b-\u065f\u0670\u0640]/g, "");
}

export function matchesDirectorySearch(values: readonly unknown[], query: string): boolean {
  const needle = normalizeDirectorySearch(query);
  return !needle || values.some(value => value != null && normalizeDirectorySearch(String(value)).includes(needle));
}
