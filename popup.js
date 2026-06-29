import { loadPresets, buildOutput } from "./lib/storage.js";
import { extractGroupedByXPaths } from "./lib/extract.js";
import { startPicker } from "./lib/picker.js";

const listEl = document.getElementById("preset-list");
const emptyEl = document.getElementById("empty");
const toastEl = document.getElementById("toast");

function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.classList.toggle("error", isError);
  toastEl.hidden = false;
  setTimeout(() => {
    toastEl.hidden = true;
  }, 2000);
}

// 対象ページ上で実行され、picker と同じ見た目のトーストを表示する。
// ページ側コンテキストで動くため外部変数に依存しないこと。
function showPageToast(message, isError, body) {
  const TOAST_ID = "__selector-copy-toast";
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
      textAlign: "left",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      pointerEvents: "none",
    });
    document.body.appendChild(toast);
  }
  toast.style.background = isError ? "#c0392b" : "#2c3e50";

  toast.replaceChildren();
  const head = document.createElement("div");
  head.textContent = message;
  toast.appendChild(head);

  if (body) {
    const preview = document.createElement("div");
    preview.textContent = body;
    Object.assign(preview.style, {
      marginTop: "4px",
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
      display: "-webkit-box",
      WebkitBoxOrient: "vertical",
      WebkitLineClamp: "4", // 4 行を超えた分は「…」で省略
      overflow: "hidden",
    });
    toast.appendChild(preview);
  }

  clearTimeout(window.__selectorCopyToastT);
  window.__selectorCopyToastT = setTimeout(() => toast.remove(), 3000);
}

// 対象ページにトーストを表示してポップアップを閉じる。
// 注入に失敗した場合はポップアップ内トーストにフォールバックする。
async function notifyOnPage(tabId, message, isError = false, body = null) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: showPageToast,
      args: [message, isError, body],
    });
  } catch (e) {
    showToast(message, isError);
    console.error(e);
  }
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

async function copyPreset(preset) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showToast("対象タブが見つかりません", true);
    return;
  }

  let groups;
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractGroupedByXPaths,
      args: [preset.xpaths],
    });
    groups = injection?.result ?? [];
  } catch (e) {
    showToast("このページでは実行できません", true);
    console.error(e);
    return;
  }

  const output = buildOutput(groups, preset);
  if (output === null) {
    await notifyOnPage(tab.id, "マッチする要素がありませんでした", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(output);
    await notifyOnPage(tab.id, "コピーしました", false, output);
  } catch (e) {
    await notifyOnPage(tab.id, "コピーに失敗しました", true);
    console.error(e);
  }
}

async function pickXPath() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showToast("対象タブが見つかりません", true);
    return;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: startPicker,
    });
    window.close(); // ポップアップを閉じてページ操作に移る
  } catch (e) {
    showToast("このページでは実行できません", true);
    console.error(e);
  }
}

function renderPresets(presets) {
  listEl.replaceChildren();
  if (presets.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  for (const preset of presets) {
    const li = document.createElement("li");

    const info = document.createElement("div");
    info.className = "preset-info";

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = preset.name || "(名前なし)";
    info.appendChild(name);

    const xpathCount = preset.xpaths.filter((x) => x.trim()).length;
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = `${xpathCount} XPath`;
    info.appendChild(count);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "コピー";
    btn.addEventListener("click", () => copyPreset(preset));

    li.appendChild(info);
    li.appendChild(btn);
    listEl.appendChild(li);
  }
}

document.getElementById("pick-xpath").addEventListener("click", pickXPath);
document.getElementById("open-options").addEventListener("click", openOptions);
document
  .getElementById("open-options-link")
  .addEventListener("click", (e) => {
    e.preventDefault();
    openOptions();
  });

loadPresets().then(renderPresets);
