// preset の永続化を担う。chrome.storage.sync に保存する。
//
// preset の形:
//   {
//     id: string,         // 一意な ID
//     name: string,       // 表示名
//     xpaths: string[],   // 対象 XPath（複数）
//     separator: string,  // 連結時の区切り文字（\n \t などのエスケープ可。未設定は \n）
//     template: string    // 出力テンプレート。{1} {2}... に各 XPath の結果(separator連結)を差し込む。
//                         // 空なら全マッチを separator で連結する従来動作。
//   }

const STORAGE_KEY = "presets";

export async function loadPresets() {
  const data = await chrome.storage.sync.get(STORAGE_KEY);
  return data[STORAGE_KEY] ?? [];
}

export async function savePresets(presets) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: presets });
}

export function createPreset() {
  return {
    id: crypto.randomUUID(),
    name: "",
    xpaths: [""],
    separator: "\\n",
    template: "",
  };
}

// 入力欄の \n \t エスケープを実際の制御文字に変換する。
export function resolveEscapes(str) {
  return (str ?? "").replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

// 区切り文字を解決する。空欄は改行扱い。
export function resolveSeparator(separator) {
  if (separator == null || separator === "") return "\n";
  return resolveEscapes(separator);
}

// グルーピング済み抽出結果(groups: string[][]) と preset から
// クリップボードへ入れる文字列を組み立てる。
//   - template が空: 全マッチを separator で連結（従来動作）
//   - template あり: {n} を n 番目 XPath の結果(separator連結)で置換し1回展開
// マッチが1件も無ければ null を返す。
export function buildOutput(groups, preset) {
  const sep = resolveSeparator(preset.separator);
  const hasMatch = groups.some((g) => g.length > 0);
  if (!hasMatch) return null;

  const template = preset.template ?? "";
  if (!template.trim()) {
    return groups.flat().join(sep);
  }

  return resolveEscapes(template).replace(/\{(\d+)\}/g, (_, n) => {
    const group = groups[Number(n) - 1];
    return group ? group.join(sep) : "";
  });
}
