export interface DaePreprocessResult {
  xml: string;
  sourceGeometryCount: number;
  sourceInstanceCount: number;
  sourceNodeCount: number;
  duplicateIdCount: number;
  repairedIds: number;
  missingTextures: string[];
}

export function preprocessDae(xml: string): DaePreprocessResult {
  const sourceGeometryCount = (xml.match(/<geometry\s+id=/g) || []).length;
  const sourceInstanceCount = (xml.match(/<instance_geometry\s+/g) || []).length;
  const sourceNodeCount = (xml.match(/<node\s+id=/g) || []).length;
  const missingTextures = extractMissingTextures(xml);

  const counts = new Map<string, number>();
  for (const match of xml.matchAll(/\bid="([^"]+)"/g)) {
    const id = match[1];
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  let duplicateIdCount = 0;
  for (const count of counts.values()) {
    if (count > 1) {
      duplicateIdCount += count - 1;
    }
  }

  let repairedIds = 0;
  let out = "";
  let last = 0;
  const occurrence = new Map<string, number>();
  const idPattern = /\bid="([^"]+)"/g;
  let match: RegExpExecArray | null;

  while ((match = idPattern.exec(xml)) !== null) {
    const id = match[1];
    const current = (occurrence.get(id) ?? 0) + 1;
    occurrence.set(id, current);
    out += xml.slice(last, match.index);
    if (current === 1) {
      out += match[0];
    } else {
      out += `id="${id}__occ${current}"`;
      repairedIds += 1;
    }
    last = idPattern.lastIndex;
  }
  out += xml.slice(last);

  return {
    xml: out,
    sourceGeometryCount,
    sourceInstanceCount,
    sourceNodeCount,
    duplicateIdCount,
    repairedIds,
    missingTextures,
  };
}

function extractMissingTextures(xml: string): string[] {
  const files = new Set<string>();
  for (const match of xml.matchAll(/<init_from>\s*([^<\s]+)\s*<\/init_from>/g)) {
    const value = match[1].replace(/^\.\//, "").replace(/\\/g, "/");
    if (/\.(jpg|jpeg|png)$/i.test(value)) {
      const basename = value.split("/").pop();
      if (basename) {
        files.add(basename);
      }
    }
  }
  return [...files].sort();
}
