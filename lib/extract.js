// 対象タブ内で実行される関数。chrome.scripting.executeScript の `func` に渡す。
// この関数はページ側のコンテキストで実行されるため、外部変数への依存を持たないこと。
//
// 各 XPath を評価し、マッチした全要素の textContent を集めて
// フラットな配列で返す。

// XPath ごとにマッチしたテキストをグルーピングして返す。
// 戻り値は xpaths と同じ並び・同じ長さの string[][]
// （空 XPath / 不正 XPath / マッチ無しは空配列）。
export function extractGroupedByXPaths(xpaths) {
  return xpaths.map((xpath) => {
    if (!xpath || !xpath.trim()) return [];
    try {
      const snapshot = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      const texts = [];
      for (let i = 0; i < snapshot.snapshotLength; i++) {
        const node = snapshot.snapshotItem(i);
        const text = (node.textContent ?? "").trim();
        if (text) texts.push(text);
      }
      return texts;
    } catch (e) {
      // 不正な XPath はスキップ
      console.warn("[Selector Copy] invalid xpath:", xpath, e);
      return [];
    }
  });
}
