import { evaluateResponse } from "./evaluator.js";
import { buildPresentationContent } from "./reaction-resolver.js";
import { ScenarioController } from "./scenario-controller.js";
import { SpeechRecognizer } from "./speech-recognizer.js";

const avatarSelect = document.querySelector("#avatar-select");
const sceneSelect = document.querySelector("#scene-select");
const voiceSelect = document.querySelector("#voice-select");
const speechLanguageSelect = document.querySelector("#speech-language-select");
const launchBtn = document.querySelector("#launch-btn");
const startBtn = document.querySelector("#start-btn");
const replayBtn = document.querySelector("#replay-btn");
const nextBtn = document.querySelector("#next-btn");
const restartBtn = document.querySelector("#restart-btn");
const micBtn = document.querySelector("#mic-btn");
const presenterStatus = document.querySelector("#presenter-status");
const appMessage = document.querySelector("#app-message");
const stagePlaceholder = document.querySelector("#stage-placeholder");
const bokeCaption = document.querySelector("#boke-caption");
const instructions = document.querySelector("#instructions");
const responseArea = document.querySelector("#response-area");
const choicesElement = document.querySelector("#choices");
const phaseLabel = document.querySelector("#phase-label");
const micIndicator = document.querySelector("#mic-indicator");
const micStatus = document.querySelector("#mic-status");
const transcriptElement = document.querySelector("#transcript");
const feedbackElement = document.querySelector("#feedback");
const scenarioTitle = document.querySelector("#scenario-title");
const scenarioDescription = document.querySelector("#scenario-description");
const progressElement = document.querySelector("#progress");
const summaryElement = document.querySelector("#summary");
const summaryScore = document.querySelector("#summary-score");
const summaryDetail = document.querySelector("#summary-detail");
const summaryBreakdown = document.querySelector("#summary-breakdown");
const speechSupportWarning = document.querySelector("#speech-support-warning");
/** @type {HTMLElement & import('@perxona/presenter-types').IPresentationWidget} */
const presenter = document.querySelector("sv-presenter");

let config;
let controller;
let presenterReady = false;
let presenterInitializing = false;
let phase = "setup";
let responseWindowStartedAt = 0;
let isRefreshingToken = false;
let availableMotions = [];
let motionCatalogAvatarId = "";
let availableVoices = [];
let catalogReady = false;
let autoAdvanceTimer = null;

const displayLanguages = [
  { key: "ja", label: "JA", lang: "ja" },
  { key: "en", label: "EN", lang: "en" },
  { key: "zh", label: "中文", lang: "zh-Hant" },
];

const recognitionLanguages = {
  en: "en-US",
  zh: "zh-TW",
  ja: "ja-JP",
};

const speechLanguageNames = {
  en: "English",
  zh: "中文",
  ja: "日本語",
};

const recognizer = new SpeechRecognizer({
  language: recognitionLanguages[speechLanguageSelect.value],
  onInterim: (transcript) => {
    transcriptElement.textContent = transcript;
  },
  onFinal: handleFinalTranscript,
  onError: handleRecognitionError,
  onEnd: handleRecognitionEnd,
});

function requestJson(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  }).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.error ?? body.detail ?? response.statusText);
      error.status = response.status;
      throw error;
    }
    return body;
  });
}

async function loadPresenterEngine(url) {
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = url;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error(`Presenterを読み込めませんでした: ${url}`));
    document.head.append(script);
  });
}

function fillSelect(select, items, preferredId) {
  select.replaceChildren(
    ...items.map(({ id, name }) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = name ?? id;
      option.selected = id === preferredId;
      return option;
    }),
  );
}

function voicesForLanguage(language) {
  const hasLanguageMetadata = availableVoices.some(
    (voice) => Array.isArray(voice.languages) && voice.languages.length > 0,
  );
  if (!hasLanguageMetadata) return availableVoices;

  return availableVoices.filter(
    (voice) =>
      Array.isArray(voice.languages) &&
      (voice.languages.includes(language) || voice.languages.includes("auto")),
  );
}

function updateVoiceOptions(preferredId = voiceSelect.value) {
  const compatibleVoices = voicesForLanguage(speechLanguageSelect.value);
  fillSelect(voiceSelect, compatibleVoices, preferredId);
  return compatibleVoices.length;
}

async function loadAvatarMotions(avatarId = avatarSelect.value) {
  if (!avatarId) {
    availableMotions = [];
    motionCatalogAvatarId = "";
    return availableMotions;
  }
  if (motionCatalogAvatarId === avatarId) return availableMotions;

  const { items = [] } = await requestJson(
    `/api/avatars/${encodeURIComponent(avatarId)}/motions`,
  );
  if (avatarSelect.value !== avatarId) return [];

  availableMotions = items
    .map((motion) => ({
      id: motion.id ?? motion.motion_id,
      name: motion.name ?? motion.id ?? motion.motion_id,
      tags: Array.isArray(motion.tags) ? motion.tags : [],
    }))
    .filter((motion) => typeof motion.id === "string" && motion.id.trim());
  motionCatalogAvatarId = avatarId;
  return availableMotions;
}

async function loadCatalog() {
  const [{ items: avatars }, { items: scenes }, { items: voices }] =
    await Promise.all([
      requestJson("/api/avatars"),
      requestJson("/api/scenes"),
      requestJson("/api/voices"),
    ]);

  const preferredTarget = config.fixedTarget ?? config.defaults ?? {};
  availableVoices = voices;
  availableMotions = [];
  motionCatalogAvatarId = "";
  fillSelect(avatarSelect, avatars, preferredTarget.avatarId);
  fillSelect(sceneSelect, scenes, preferredTarget.sceneId);
  updateVoiceOptions(preferredTarget.voiceId);

  if (!avatarSelect.value || !sceneSelect.value || !voiceSelect.value) {
    throw new Error("利用できるAvatar、Scene、Voiceを確認してください。");
  }
  catalogReady = true;
}

function selectedTarget() {
  return {
    avatarId: avatarSelect.value,
    sceneId: sceneSelect.value,
    voiceId: voiceSelect.value || undefined,
  };
}

async function initializePresenter() {
  if (presenterInitializing || config.mock) return;

  presenterInitializing = true;
  launchBtn.disabled = true;
  setPresenterStatus("音声を有効にしています…");

  try {
    await presenter.resumeAudioPlayback();
    setPresenterStatus("リアクション用モーションを取得しています…");
    try {
      await loadAvatarMotions();
    } catch (error) {
      availableMotions = [];
      motionCatalogAvatarId = "";
      console.warn("リアクション用モーションを取得できませんでした。", error);
    }
    setPresenterStatus("Connectトークンを取得しています…");
    const { connect_token: connectToken } =
      await requestJson("/api/connect-token");
    setPresenterStatus("アバターを準備しています…");
    await presenter.initialize(connectToken, selectedTarget());
  } catch (error) {
    presenterReady = false;
    launchBtn.disabled = false;
    setPresenterStatus(`準備に失敗しました: ${error.message}`);
  } finally {
    presenterInitializing = false;
  }
}

function setPresenterStatus(message) {
  presenterStatus.textContent = message;
}

function setAppMessage(message) {
  appMessage.textContent = message;
}

function renderProgress() {
  const { current, total } = controller.progress;
  progressElement.textContent = `${Math.max(0, current)} / ${total}`;
}

function renderChoices(beat) {
  choicesElement.replaceChildren(
    ...beat.choices.map((choice, index) => {
      const row = document.createElement("div");
      row.className = "choice";
      row.dataset.choiceId = choice.id;

      const number = document.createElement("span");
      number.className = "choice-number";
      number.textContent = String(index + 1);

      const text = document.createElement("div");
      text.className = "choice-text";
      renderLocalizedText(text, choice.text);
      row.append(number, text);
      return row;
    }),
  );
}

function renderLocalizedText(element, value) {
  element.classList.add("localized-text");
  element.replaceChildren(
    ...displayLanguages.map(({ key, label, lang }) => {
      const line = document.createElement("span");
      line.className = `language-line language-${key}`;
      line.lang = lang;

      const languageLabel = document.createElement("span");
      languageLabel.className = "language-label";
      languageLabel.textContent = label;
      languageLabel.setAttribute("aria-hidden", "true");

      const languageText = document.createElement("span");
      languageText.className = "language-text";
      languageText.textContent = localizedText(value, key);
      line.append(languageLabel, languageText);
      return line;
    }),
  );
}

function localizedText(value, language) {
  if (typeof value === "string") return value;
  return value?.[language] ?? value?.ja ?? "";
}

async function playCurrentBeat() {
  clearAutoAdvance();
  const beat = controller.currentBeat;
  if (!beat) {
    showSummary();
    return;
  }

  recognizer.abort();
  presenter.setListening?.(false);
  phase = "boke-speaking";
  renderProgress();
  renderChoices(beat);
  choicesElement.hidden = true;
  responseArea.hidden = false;
  instructions.hidden = true;
  summaryElement.hidden = true;
  feedbackElement.hidden = true;
  replayBtn.hidden = true;
  nextBtn.hidden = true;
  restartBtn.hidden = true;
  micBtn.hidden = true;
  transcriptElement.textContent = "—";
  micIndicator.classList.remove("listening");
  micStatus.textContent = "ボケを再生中";
  phaseLabel.textContent = "ボケを聞いてください";
  renderLocalizedText(bokeCaption, beat.boke);
  bokeCaption.hidden = false;
  setAppMessage("ボケの発話が終わると、マイクが自動的に待ち受けます。");

  try {
    const presentation = buildPresentationContent(
      localizedText(beat.boke, speechLanguageSelect.value),
      beat.reaction,
      availableMotions,
    );
    if (beat.reaction && !presentation.motion) {
      console.warn(
        `リアクション「${localizedText(beat.reaction.description, "ja")}」に対応するモーションがないため、自動モーションで再生します。`,
      );
    }
    const result = await presenter.present(presentation.content);
    if (!result?.success) {
      phase = "ready";
      setAppMessage(
        `ボケを再生できませんでした (${result?.code}): ${result?.message ?? ""}`,
      );
      replayBtn.hidden = false;
    }
  } catch (error) {
    phase = "ready";
    setAppMessage(`ボケを再生できませんでした: ${error.message}`);
    replayBtn.hidden = false;
  }
}

function openResponseWindow() {
  if (phase !== "boke-speaking") return;

  phase = "answering";
  responseWindowStartedAt = performance.now();
  choicesElement.hidden = false;
  phaseLabel.textContent = `${speechLanguageNames[speechLanguageSelect.value]}で、好きなツッコミを一つ声に出してください`;
  micStatus.textContent = "マイクを開始します…";
  presenter.setListening?.(true);
  micBtn.hidden = false;
  setAppMessage("9秒以内を目安に発声してください。");

  window.setTimeout(() => {
    if (phase === "answering") startRecognition();
  }, 250);
}

function startRecognition() {
  if (phase !== "answering" || recognizer.active) return;

  recognizer.setLanguage(recognitionLanguages[speechLanguageSelect.value]);
  transcriptElement.textContent = "聞き取っています…";
  feedbackElement.hidden = true;
  micBtn.hidden = true;
  micIndicator.classList.add("listening");
  micStatus.textContent = `聞き取り中（${speechLanguageNames[speechLanguageSelect.value]}）`;

  try {
    recognizer.start();
  } catch (error) {
    micIndicator.classList.remove("listening");
    micStatus.textContent = "マイクを開始できません";
    micBtn.hidden = false;
    setAppMessage(error.message);
  }
}

function handleFinalTranscript(transcript) {
  if (phase !== "answering") return;

  transcriptElement.textContent = transcript;
  const reactionSeconds = Math.max(
    0,
    (performance.now() - responseWindowStartedAt) / 1000,
  );
  const result = evaluateResponse(
    controller.currentBeat,
    transcript,
    reactionSeconds,
    speechLanguageSelect.value,
  );

  if (!result.matched) {
    feedbackElement.className = "feedback needs-retry";
    feedbackElement.replaceChildren(createParagraph(result.feedback));
    feedbackElement.hidden = false;
    micStatus.textContent = "選択肢を特定できませんでした";
    micIndicator.classList.remove("listening");
    micBtn.hidden = false;
    setAppMessage("認識結果を確認して、もう一度発声してください。");
    return;
  }

  phase = "feedback";
  presenter.setListening?.(false);
  controller.recordResult(result);
  micIndicator.classList.remove("listening");
  micStatus.textContent = "判定完了";
  micBtn.hidden = true;
  phaseLabel.textContent = `今回のスコア: ${result.totalScore}点`;
  showEvaluation(result);
  highlightChoice(result.choiceId);
  replayBtn.hidden = false;
  nextBtn.hidden = false;
  const nextAction =
    controller.progress.current === controller.progress.total
      ? "結果を見る"
      : "次のボケへ";
  nextBtn.textContent = `${nextAction}（2秒後）`;
  setAppMessage(
    `内容80点・反応速度20点の合計です。2秒後に「${nextAction}」へ進みます。`,
  );
  scheduleAutoAdvance();
}

function showEvaluation(result) {
  const scoreLine = document.createElement("div");
  scoreLine.className = "score-line";
  scoreLine.append(
    createScoreChip(`内容 ${result.contentScore} / 80`),
    createScoreChip(`間 ${result.timingScore} / 20`),
    createScoreChip(`${result.reactionSeconds.toFixed(1)}秒`),
    createScoreChip(`認識一致 ${Math.round(result.similarity * 100)}%`),
  );

  const matched = createParagraph(`判定: 「${result.choiceText}」`);
  const feedback = createParagraph(result.feedback);
  feedbackElement.className = "feedback";
  feedbackElement.replaceChildren(scoreLine, matched, feedback);
  feedbackElement.hidden = false;
}

function createScoreChip(text) {
  const chip = document.createElement("span");
  chip.className = "score-chip";
  chip.textContent = text;
  return chip;
}

function createParagraph(text) {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  return paragraph;
}

function createLabeledParagraph(label, value) {
  const paragraph = document.createElement("p");
  paragraph.className = "summary-result-detail";
  const heading = document.createElement("strong");
  heading.textContent = `${label}: `;
  paragraph.append(heading, document.createTextNode(value));
  return paragraph;
}

function highlightChoice(choiceId) {
  for (const choice of choicesElement.querySelectorAll(".choice")) {
    choice.classList.toggle("matched", choice.dataset.choiceId === choiceId);
  }
}

function handleRecognitionError(code) {
  if (phase !== "answering") return;

  const messages = {
    "not-allowed": "マイクの使用が許可されていません。ブラウザーの設定を確認してください。",
    "audio-capture": "利用できるマイクが見つかりません。",
    "no-speech": "音声を聞き取れませんでした。もう一度試してください。",
    network: "音声認識サービスに接続できませんでした。",
    "language-not-supported": "選択した言語はChromeの音声認識でサポートされていません。",
    "language-unavailable": "選択した音声認識言語を現在利用できません。",
  };
  setAppMessage(messages[code] ?? `音声認識エラー: ${code}`);
}

function handleRecognitionEnd(receivedFinalResult) {
  micIndicator.classList.remove("listening");
  if (phase !== "answering" || receivedFinalResult) return;

  micStatus.textContent = "音声を聞き取れませんでした";
  micBtn.hidden = false;
  if (transcriptElement.textContent === "聞き取っています…") {
    transcriptElement.textContent = "—";
  }
}

function clearAutoAdvance() {
  if (autoAdvanceTimer !== null) {
    window.clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }
}

function scheduleAutoAdvance() {
  clearAutoAdvance();
  autoAdvanceTimer = window.setTimeout(() => {
    autoAdvanceTimer = null;
    if (phase === "feedback") advanceTraining();
  }, 2000);
}

function startTraining() {
  if (!presenterReady || !recognizer.supported) return;

  clearAutoAdvance();
  controller.start();
  startBtn.hidden = true;
  restartBtn.hidden = true;
  void playCurrentBeat();
}

function advanceTraining() {
  clearAutoAdvance();
  nextBtn.hidden = true;
  replayBtn.hidden = true;
  controller.advance();
  if (controller.isComplete) {
    showSummary();
  } else {
    void playCurrentBeat();
  }
}

function showSummary() {
  clearAutoAdvance();
  phase = "complete";
  recognizer.abort();
  presenter.setListening?.(false);
  bokeCaption.hidden = true;
  responseArea.hidden = true;
  summaryElement.hidden = false;
  nextBtn.hidden = true;
  replayBtn.hidden = true;
  restartBtn.hidden = false;
  progressElement.textContent = `${controller.progress.total} / ${controller.progress.total}`;

  const summary = controller.summary;
  summaryScore.textContent = `${summary.totalScore} / ${summary.maximumScore} 点`;
  summaryDetail.textContent = `平均反応時間 ${summary.averageReactionSeconds.toFixed(1)}秒・${summary.completedBeats}本完了`;
  renderSummaryBreakdown();
  setAppMessage("お疲れさまでした。何度でも最初から挑戦できます。");
}

function renderSummaryBreakdown() {
  summaryBreakdown.replaceChildren(
    ...controller.resultDetails.map(({ beatNumber, beat, result }) => {
      const card = document.createElement("article");
      card.className = "summary-result";

      const header = document.createElement("header");
      header.className = "summary-result-header";
      const title = document.createElement("h4");
      title.className = "summary-result-title";
      title.textContent = `第${beatNumber}問`;
      const total = document.createElement("span");
      total.className = "summary-result-total";
      total.textContent = `${result.totalScore} / 100 点`;
      header.append(title, total);

      const boke = document.createElement("div");
      boke.className = "summary-result-boke";
      renderLocalizedText(boke, beat.boke);

      const scoreLine = document.createElement("div");
      scoreLine.className = "score-line";
      scoreLine.append(
        createScoreChip(`内容 ${result.contentScore} / 80`),
        createScoreChip(`間 ${result.timingScore} / 20`),
        createScoreChip(`反応 ${result.reactionSeconds.toFixed(1)}秒`),
        createScoreChip(`一致 ${Math.round(result.similarity * 100)}%`),
      );

      const feedback = createParagraph(result.feedback);
      feedback.className = "summary-result-feedback";
      card.append(
        header,
        boke,
        scoreLine,
        createLabeledParagraph("認識した発言", result.transcript),
        createLabeledParagraph("判定したツッコミ", result.choiceText),
        feedback,
      );
      return card;
    }),
  );
}

presenter.addEventListener("PRESENTER_STATUS", (event) => {
  const currentStatus = event.detail?.status;
  if (currentStatus === "Ready") {
    presenterReady = true;
    presenter.hidden = false;
    stagePlaceholder.hidden = true;
    launchBtn.textContent = "準備完了";
    launchBtn.disabled = true;
    startBtn.disabled = !recognizer.supported;
    setPresenterStatus("アバターの準備ができました。");
  } else if (currentStatus) {
    setPresenterStatus(currentStatus === "Initializing" ? "初期化中…" : currentStatus);
  }
});

presenter.addEventListener("ALL_PERFORMANCE_FINISHED", () => {
  openResponseWindow();
});

presenter.addEventListener("CONNECT_TOKEN_EXPIRED", async () => {
  if (isRefreshingToken) return;
  isRefreshingToken = true;
  try {
    const { connect_token: freshToken } =
      await requestJson("/api/connect-token");
    presenter.refreshConnectToken(freshToken);
    setPresenterStatus("Connectトークンを更新しました。");
  } catch (error) {
    setPresenterStatus(`トークン更新に失敗しました: ${error.message}`);
  } finally {
    isRefreshingToken = false;
  }
});

launchBtn.addEventListener("click", initializePresenter);
startBtn.addEventListener("click", startTraining);
micBtn.addEventListener("click", startRecognition);
replayBtn.addEventListener("click", () => void playCurrentBeat());
nextBtn.addEventListener("click", advanceTraining);
restartBtn.addEventListener("click", startTraining);

function requirePresenterPreparation() {
  clearAutoAdvance();
  if (presenterReady) {
    recognizer.abort();
    presenter.setListening?.(false);
    presenter.interruptPresentation?.();
    presenterReady = false;
    phase = "setup";
    startBtn.disabled = true;
    launchBtn.textContent = "アバターを再準備";
  }
  launchBtn.disabled = config?.mock || !catalogReady || !voiceSelect.value;
  setPresenterStatus(
    voiceSelect.value
      ? "選択が変わりました。アバターを再準備してください。"
      : "選択した言語に対応するVoiceがありません。",
  );
}

avatarSelect.addEventListener("change", () => {
  availableMotions = [];
  motionCatalogAvatarId = "";
  requirePresenterPreparation();
});

for (const select of [sceneSelect, voiceSelect]) {
  select.addEventListener("change", () => {
    requirePresenterPreparation();
  });
}

speechLanguageSelect.addEventListener("change", () => {
  recognizer.setLanguage(recognitionLanguages[speechLanguageSelect.value]);
  updateVoiceOptions();
  requirePresenterPreparation();
});

async function initializeApp() {
  try {
    const [loadedConfig, scenario] = await Promise.all([
      requestJson("/api/config"),
      requestJson("./scenarios/convenience-store.json"),
    ]);
    config = loadedConfig;
    controller = new ScenarioController(scenario);
    renderLocalizedText(scenarioTitle, scenario.title);
    renderLocalizedText(scenarioDescription, scenario.description);
    progressElement.textContent = `0 / ${scenario.beats.length}`;

    if (!recognizer.supported) {
      speechSupportWarning.hidden = false;
      setAppMessage("音声認識対応ブラウザーで開いてください。");
    }

    if (config.mock) {
      await loadCatalog();
      launchBtn.disabled = true;
      setPresenterStatus("Mockモードではアバターを起動できません。");
      return;
    }

    await loadPresenterEngine(config.presenterUrl);
    await loadCatalog();
    launchBtn.disabled = false;
    setPresenterStatus("Avatar、Scene、Voiceを確認して準備してください。");
  } catch (error) {
    launchBtn.disabled = true;
    startBtn.disabled = true;
    setPresenterStatus(`初期化に失敗しました: ${error.message}`);
    setAppMessage("サーバーの設定と接続状態を確認してください。");
    console.error(error);
  }
}

initializeApp();
