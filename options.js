import { loadPresets, savePresets, createPreset } from "./lib/storage.js";

const presetsEl = document.getElementById("presets");
const emptyEl = document.getElementById("empty");
const toastEl = document.getElementById("toast");
const presetTemplate = document.getElementById("preset-template");
const xpathTemplate = document.getElementById("xpath-template");

let presets = [];
let saveTimer = null;

function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toastEl.hidden = true;
  }, 1500);
}

// 入力のたびに即保存するとうるさいので少し遅延させる
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await savePresets(presets);
    showToast("保存しました");
  }, 400);
}

function renderXPathRow(preset, index) {
  const frag = xpathTemplate.content.cloneNode(true);
  const row = frag.querySelector(".xpath-row");
  const input = row.querySelector(".xpath-input");

  input.value = preset.xpaths[index] ?? "";
  input.addEventListener("input", () => {
    preset.xpaths[index] = input.value;
    scheduleSave();
  });

  row.querySelector(".delete-xpath").addEventListener("click", () => {
    preset.xpaths.splice(index, 1);
    if (preset.xpaths.length === 0) preset.xpaths.push("");
    render();
    scheduleSave();
  });

  return row;
}

function renderPreset(preset) {
  const frag = presetTemplate.content.cloneNode(true);
  const section = frag.querySelector(".preset");

  const nameInput = section.querySelector(".preset-name");
  nameInput.value = preset.name;
  nameInput.addEventListener("input", () => {
    preset.name = nameInput.value;
    scheduleSave();
  });

  const separatorInput = section.querySelector(".preset-separator");
  separatorInput.value = preset.separator ?? "\\n";
  separatorInput.addEventListener("input", () => {
    preset.separator = separatorInput.value;
    scheduleSave();
  });

  const templateInput = section.querySelector(".preset-template");
  templateInput.value = preset.template ?? "";
  templateInput.addEventListener("input", () => {
    preset.template = templateInput.value;
    scheduleSave();
  });

  section.querySelector(".delete-preset").addEventListener("click", () => {
    presets = presets.filter((p) => p.id !== preset.id);
    render();
    scheduleSave();
  });

  const xpathsEl = section.querySelector(".xpaths");
  preset.xpaths.forEach((_, i) => {
    xpathsEl.appendChild(renderXPathRow(preset, i));
  });

  section.querySelector(".add-xpath").addEventListener("click", () => {
    preset.xpaths.push("");
    render();
    scheduleSave();
  });

  return section;
}

function render() {
  presetsEl.replaceChildren();
  emptyEl.hidden = presets.length > 0;
  for (const preset of presets) {
    presetsEl.appendChild(renderPreset(preset));
  }
}

document.getElementById("add-preset").addEventListener("click", () => {
  presets.push(createPreset());
  render();
  scheduleSave();
});

loadPresets().then((loaded) => {
  presets = loaded;
  render();
});
