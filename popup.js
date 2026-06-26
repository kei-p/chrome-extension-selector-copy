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
    showToast("マッチする要素がありませんでした", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(output);
    const total = groups.reduce((sum, g) => sum + g.length, 0);
    showToast(`${total} 件をコピーしました`);
  } catch (e) {
    showToast("コピーに失敗しました", true);
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
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-btn";

    const name = document.createElement("span");
    name.textContent = preset.name || "(名前なし)";
    btn.appendChild(name);

    const xpathCount = preset.xpaths.filter((x) => x.trim()).length;
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = `${xpathCount} XPath`;
    btn.appendChild(count);

    btn.addEventListener("click", () => copyPreset(preset));
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
