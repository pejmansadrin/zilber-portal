export function accountSectionHref(section?: string) {
  const query = section ? `?section=${encodeURIComponent(section)}` : "";
  return `/account${query}#account-workspace`;
}
