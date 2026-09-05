export function syncAutomaticProjectName(currentName: string, currentRoot: string, nextRoot?: string): string {
  if (nextRoot === undefined) return currentName;
  const normalizedNextRoot = nextRoot.trim();
  return isAutomaticProjectName(currentName, currentRoot) && normalizedNextRoot ? normalizedNextRoot : currentName;
}

export function isAutomaticProjectName(currentName: string, currentRoot: string): boolean {
  const normalizedCurrentRoot = currentRoot.trim();
  return new Set([
    normalizedCurrentRoot,
    `词根 ${normalizedCurrentRoot}`,
    `Root ${normalizedCurrentRoot}`,
  ]).has(currentName.trim());
}

export function normalizeLegacyAutomaticProjectName(currentName: string, currentRoot: string): string {
  const normalizedRoot = currentRoot.trim();
  return normalizedRoot && /^(?:词根|Root)\s+\S/i.test(currentName.trim()) ? normalizedRoot : currentName;
}
