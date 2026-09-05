export type WordPair = {text: string; meaningZh: string};

export function parseWordPairs(input: string): WordPair[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const pairs: WordPair[] = [];

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    const columns = splitInlinePair(line);
    if (columns.length >= 2) {
      pairs.push(asWordPair(columns[0], columns.slice(1).join(" ")));
      index += 1;
      continue;
    }

    const next = lines[index + 1];
    if (next) {
      pairs.push(asWordPair(line, next));
      index += 2;
      continue;
    }
    index += 1;
  }

  return pairs.filter((pair) => pair.text && pair.meaningZh);
}

function splitInlinePair(line: string): string[] {
  const explicitColumns = line.split(/\t+|\s{2,}|\s*[|｜,，;；]\s*/).filter(Boolean);
  if (explicitColumns.length >= 2) return explicitColumns;

  const englishThenChinese = line.match(/^([A-Za-z][A-Za-z\s'’-]*?)\s+([\p{Script=Han}].*)$/u);
  if (englishThenChinese) return [englishThenChinese[1], englishThenChinese[2]];
  const chineseThenEnglish = line.match(/^([\p{Script=Han}].*?)\s+([A-Za-z][A-Za-z\s'’-]*)$/u);
  if (chineseThenEnglish) return [chineseThenEnglish[1], chineseThenEnglish[2]];
  return explicitColumns;
}

function asWordPair(first: string, second: string): WordPair {
  const firstLooksEnglish = /^[A-Za-z][A-Za-z\s'’-]*$/.test(first);
  const secondLooksEnglish = /^[A-Za-z][A-Za-z\s'’-]*$/.test(second);
  if (!firstLooksEnglish && secondLooksEnglish) return {text: second, meaningZh: first};
  return {text: first, meaningZh: second};
}
