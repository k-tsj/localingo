const MODEL_NAME = "gemma2:2b";
const OLLAMA_ENDPOINT = "http://localhost:11434/api/generate";
const DEFAULT_STATUS = "Cmd/Ctrl+EnterでLLMパイプラインを実行します。";

const contextInput = document.getElementById("contextInput");
const englishInput = document.getElementById("englishInput");
const correctedOutput = document.getElementById("correctedOutput");
const japaneseOutput = document.getElementById("japaneseOutput");
const englishVariants = document.getElementById("englishVariants");
const statusMessage = document.getElementById("statusMessage");

let isRunning = false;
let rerunPending = false;

function setStatus(message, tone = "muted") {
  statusMessage.textContent = message;
  if (tone === "alert") {
    statusMessage.dataset.tone = "alert";
  } else {
    delete statusMessage.dataset.tone;
  }
}

async function callOllama(prompt) {
  const response = await fetch(OLLAMA_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL_NAME, prompt, stream: false })
  });

  if (!response.ok) {
    throw new Error(`LLMエラー: ${response.status}`);
  }

  const data = await response.json();
  if (!data.response) {
    throw new Error("LLMが応答を返しませんでした");
  }
  return data.response.trim();
}

function buildCorrectionPrompt(context, original) {
  const ctx = context ? `\n\n【関連コンテキスト】\n${context}` : "";
  return `You are localingo, an English proofreading assistant. Fix grammar, spelling, tense, and wording issues while preserving the original structure and intent. Do not add explanations. Return only the corrected English text.${ctx}\n\n【校正対象】\n${original}`;
}

function buildJapanesePrompt(original) {
  return `You are a professional bilingual translator. Translate the following English text into natural, context-aware Japanese suitable for business communication. Return only the Japanese translation without explanation.\n\n【English】\n${original}`;
}

function buildVariantsPrompt(japanese) {
  return `You are an English copy expert. Using the Japanese text below as the source meaning, produce three alternative English sentences that sound natural and native. Keep them concise and faithful to the meaning. Format strictly as:\n1. sentence one\n2. sentence two\n3. sentence three\n\n【Japanese】\n${japanese}`;
}

function setOutput(target, text) {
  target.textContent = text;
  target.classList.toggle("placeholder", !text);
}

function renderVariants(list) {
  if (!list.length) {
    englishVariants.innerHTML = '<div class="variant-card placeholder">候補を生成できませんでした。</div>';
    return;
  }
  englishVariants.innerHTML = "";
  list.forEach((entry, index) => {
    const card = document.createElement("article");
    card.className = "variant-card";
    card.innerHTML = `
      <header>
        <h3>案 ${index + 1}</h3>
        <button class="btn" data-copy-text>copy</button>
      </header>
      <p>${escapeHtml(entry)}</p>
    `;
    const copyBtn = card.querySelector("[data-copy-text]");
    copyBtn.addEventListener("click", () => copyToClipboard(entry));
    englishVariants.appendChild(card);
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>\"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char] || char));
}

function parseVariants(raw) {
  const matches = [];
  const regex = /^\s*(?:\d+\.|[-*])\s*(.+)$/gm;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    matches.push(match[1].trim());
  }
  if (matches.length >= 3) return matches.slice(0, 3);
  return raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
}

async function runPipeline() {
  if (!englishInput.value.trim()) {
    setStatus("入力が空のため処理をスキップしました。", "alert");
    return;
  }
  if (isRunning) {
    rerunPending = true;
    return;
  }
  isRunning = true;
  rerunPending = false;
  setStatus("LLMへ送信中…");
  correctedOutput.textContent = "生成中…";
  correctedOutput.classList.remove("placeholder");
  japaneseOutput.textContent = "生成中…";
  japaneseOutput.classList.remove("placeholder");
  englishVariants.innerHTML = '<div class="variant-card">生成中…</div>';
  try {
    const original = englishInput.value.trim();
    const context = contextInput.value.trim();

    const corrected = await callOllama(buildCorrectionPrompt(context, original));
    setOutput(correctedOutput, corrected);

    const japanese = await callOllama(buildJapanesePrompt(original));
    setOutput(japaneseOutput, japanese);

    const variantsRaw = await callOllama(buildVariantsPrompt(japanese));
    const list = parseVariants(variantsRaw);
    renderVariants(list);
    setStatus("完了: 再度Cmd/Ctrl+Enterで最新の結果に更新できます。");
  } catch (error) {
    console.error(error);
    setStatus(error.message, "alert");
    setOutput(correctedOutput, "エラーが発生しました。");
    setOutput(japaneseOutput, "エラーが発生しました。");
    englishVariants.innerHTML = '<div class="variant-card placeholder">エラーが発生しました。</div>';
  } finally {
    isRunning = false;
    if (rerunPending) {
      rerunPending = false;
      runPipeline();
    }
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    setStatus("コピーしました。");
  }).catch(() => {
    setStatus("クリップボードにアクセスできません。", "alert");
  });
}

function wireButtons() {
  document.querySelectorAll('[data-clear]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.clear);
      if (target) {
        if (typeof target.value !== 'undefined') {
          target.value = '';
        } else {
          target.textContent = '';
        }
        if (typeof target.focus === 'function') {
          target.focus();
        }
        if (target === englishInput) {
          setStatus(DEFAULT_STATUS);
        }
      }
    });
  });

  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.copy);
      if (!target) return;
      const text = target.value !== undefined ? target.value : target.textContent;
      copyToClipboard(text.trim());
    });
  });
}

function init() {
  wireButtons();
  englishInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      runPipeline();
    }
  });
  setStatus(DEFAULT_STATUS);
}

window.addEventListener('DOMContentLoaded', init);
