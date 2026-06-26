// 対象タブ内で実行される関数。chrome.scripting.executeScript の `func` に渡す。
// ページ側のコンテキストで実行されるため、外部変数への依存を持たないこと。
//
// 要素ピッカーを起動する:
//   - ホバー中の要素をハイライト表示
//   - クリックで XPath を生成してクリップボードへコピー
//   - Esc でキャンセル

export function startPicker() {
  // 多重起動を防ぐ
  if (window.__selectorCopyPicking) return;
  window.__selectorCopyPicking = true;

  const HIGHLIGHT_ID = "__selector-copy-highlight";
  const TOAST_ID = "__selector-copy-toast";

  // 要素の XPath を生成する。id が一意ならそれを優先する。
  function buildXPath(el) {
    if (el.id) {
      const sameId = document.querySelectorAll(
        `[id="${CSS.escape(el.id)}"]`
      );
      if (sameId.length === 1) return `//*[@id="${el.id}"]`;
    }

    const parts = [];
    let node = el;
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.nodeName.toLowerCase();
      let index = 1;
      let sibling = node.previousElementSibling;
      while (sibling) {
        if (sibling.nodeName.toLowerCase() === tag) index++;
        sibling = sibling.previousElementSibling;
      }
      parts.unshift(`${tag}[${index}]`);
      node = node.parentElement;
    }
    return "/" + parts.join("/");
  }

  const highlight = document.createElement("div");
  highlight.id = HIGHLIGHT_ID;
  Object.assign(highlight.style, {
    position: "fixed",
    zIndex: "2147483647",
    pointerEvents: "none",
    background: "rgba(64, 153, 255, 0.25)",
    border: "1px solid rgba(64, 153, 255, 0.9)",
    boxSizing: "border-box",
    transition: "all 40ms ease-out",
  });
  document.body.appendChild(highlight);

  function showToast(message, isError = false) {
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement("div");
      toast.id = TOAST_ID;
      Object.assign(toast.style, {
        position: "fixed",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: "2147483647",
        padding: "8px 14px",
        borderRadius: "6px",
        font: "13px/1.4 system-ui, sans-serif",
        color: "#fff",
        maxWidth: "80vw",
        wordBreak: "break-all",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        pointerEvents: "none",
      });
      document.body.appendChild(toast);
    }
    toast.style.background = isError ? "#c0392b" : "#2c3e50";
    toast.textContent = message;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.remove(), 3000);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // フォールバック: execCommand
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (_) {
        ok = false;
      }
      ta.remove();
      return ok;
    }
  }

  let current = null;

  function onMouseMove(e) {
    const el = e.target;
    if (!el || el === current) return;
    current = el;
    const rect = el.getBoundingClientRect();
    highlight.style.top = `${rect.top}px`;
    highlight.style.left = `${rect.left}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
  }

  function cleanup() {
    window.__selectorCopyPicking = false;
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    highlight.remove();
  }

  async function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;
    cleanup();

    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      showToast("要素を取得できませんでした", true);
      return;
    }
    const xpath = buildXPath(el);
    const ok = await copyText(xpath);
    showToast(ok ? `コピーしました: ${xpath}` : `コピー失敗: ${xpath}`, !ok);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      cleanup();
      showToast("キャンセルしました");
    }
  }

  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
  showToast("要素をクリックして XPath を取得（Esc でキャンセル）");
}
