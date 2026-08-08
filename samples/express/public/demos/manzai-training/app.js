import { evaluateResponse } from "./evaluator.js";
import { applyTranslations, translate } from "./i18n.js";
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

const AUTO_ADVANCE_DELAY_MS = 5000;

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

function t(key, parameters = {}) {
  return translate(speechLanguageSelect.value, key, parameters);
}

function applyUiLanguage() {
  applyTranslations(document, speechLanguageSelect.value);
  if (!scenarioTitle.classList.contains("localized-text")) {
    scenarioTitle.textContent = t("scenarioLoading");
  }
}

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
      reject(new Error(t("presenterLoadFailed", { url })));
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
    throw new Error(t("catalogUnavailable"));
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
  setPresenterStatus(t("enablingAudio"));

  try {
    await presenter.resumeAudioPlayback();
    setPresenterStatus(t("loadingReactionMotions"));
    try {
      await loadAvatarMotions();
    } catch (error) {
      availableMotions = [];
      motionCatalogAvatarId = "";
      console.warn(t("reactionMotionLoadFailed"), error);
    }
    setPresenterStatus(t("gettingToken"));
    const { connect_token: connectToken } =
      await requestJson("/api/connect-token");
    setPresenterStatus(t("preparingAvatar"));
    await presenter.initialize(connectToken, selectedTarget());
  } catch (error) {
    presenterReady = false;
    launchBtn.disabled = false;
    setPresenterStatus(t("preparationFailed", { message: error.message }));
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
  micStatus.textContent = t("playingBoke");
  phaseLabel.textContent = t("listenToBoke");
  renderLocalizedText(bokeCaption, beat.boke);
  bokeCaption.hidden = false;
  setAppMessage(t("autoMicAfterBoke"));

  try {
    const presentation = buildPresentationContent(
      localizedText(beat.boke, speechLanguageSelect.value),
      beat.reaction,
      availableMotions,
    );
    if (beat.reaction && !presentation.motion) {
      console.warn(
        t("motionFallbackWarning", {
          reaction: localizedText(
            beat.reaction.description,
            speechLanguageSelect.value,
          ),
        }),
      );
    }
    const result = await presenter.present(presentation.content);
    if (!result?.success) {
      phase = "ready";
      setAppMessage(
        t("playFailedWithCode", {
          code: result?.code,
          message: result?.message ?? "",
        }),
      );
      replayBtn.hidden = false;
    }
  } catch (error) {
    phase = "ready";
    setAppMessage(t("playFailed", { message: error.message }));
    replayBtn.hidden = false;
  }
}

function openResponseWindow() {
  if (phase !== "boke-speaking") return;

  phase = "answering";
  responseWindowStartedAt = performance.now();
  choicesElement.hidden = false;
  phaseLabel.textContent = t("speakOneComeback", {
    language: t("languageName"),
  });
  micStatus.textContent = t("startingMic");
  presenter.setListening?.(true);
  micBtn.hidden = false;
  setAppMessage(t("speakWithinNineSeconds"));

  window.setTimeout(() => {
    if (phase === "answering") startRecognition();
  }, 250);
}

function startRecognition() {
  if (phase !== "answering" || recognizer.active) return;

  recognizer.setLanguage(recognitionLanguages[speechLanguageSelect.value]);
  transcriptElement.textContent = t("listeningTranscript");
  feedbackElement.hidden = true;
  micBtn.hidden = true;
  micIndicator.classList.add("listening");
  micStatus.textContent = t("listeningLanguage", {
    language: t("languageName"),
  });

  try {
    recognizer.start();
  } catch (error) {
    micIndicator.classList.remove("listening");
    micStatus.textContent = t("micStartFailed");
    micBtn.hidden = false;
    setAppMessage(t("micStartError", { message: error.message }));
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
    micStatus.textContent = t("choiceNotFound");
    micIndicator.classList.remove("listening");
    micBtn.hidden = false;
    setAppMessage(t("retrySpeech"));
    return;
  }

  phase = "feedback";
  presenter.setListening?.(false);
  controller.recordResult(result);
  micIndicator.classList.remove("listening");
  micStatus.textContent = t("judgingComplete");
  micBtn.hidden = true;
  phaseLabel.textContent = t("currentScore", { score: result.totalScore });
  showEvaluation(result);
  highlightChoice(result.choiceId);
  replayBtn.hidden = false;
  nextBtn.hidden = false;
  const nextAction =
    controller.progress.current === controller.progress.total
      ? t("viewResults")
      : t("nextBoke");
  const delaySeconds = AUTO_ADVANCE_DELAY_MS / 1000;
  nextBtn.textContent = t("autoAdvanceLabel", {
    action: nextAction,
    seconds: delaySeconds,
  });
  setAppMessage(
    t("scoreExplanation", { action: nextAction, seconds: delaySeconds }),
  );
  scheduleAutoAdvance();
}

function showEvaluation(result) {
  const scoreLine = document.createElement("div");
  scoreLine.className = "score-line";
  scoreLine.append(
    createScoreChip(t("contentScore", { score: result.contentScore })),
    createScoreChip(t("timingScore", { score: result.timingScore })),
    createScoreChip(
      t("seconds", { seconds: result.reactionSeconds.toFixed(1) }),
    ),
    createScoreChip(
      t("recognitionMatch", {
        percent: Math.round(result.similarity * 100),
      }),
    ),
  );

  const matched = createParagraph(
    t("judgedChoice", { choice: result.choiceText }),
  );
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
    "not-allowed": t("errorNotAllowed"),
    "audio-capture": t("errorAudioCapture"),
    "no-speech": t("errorNoSpeech"),
    network: t("errorNetwork"),
    "language-not-supported": t("errorLanguageNotSupported"),
    "language-unavailable": t("errorLanguageUnavailable"),
  };
  setAppMessage(messages[code] ?? t("recognitionError", { code }));
}

function handleRecognitionEnd(receivedFinalResult) {
  micIndicator.classList.remove("listening");
  if (phase !== "answering" || receivedFinalResult) return;

  micStatus.textContent = t("noSpeechDetected");
  micBtn.hidden = false;
  if (transcriptElement.textContent === t("listeningTranscript")) {
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
  }, AUTO_ADVANCE_DELAY_MS);
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
  summaryScore.textContent = t("summaryScore", {
    total: summary.totalScore,
    maximum: summary.maximumScore,
  });
  summaryDetail.textContent = t("summaryDetail", {
    seconds: summary.averageReactionSeconds.toFixed(1),
    count: summary.completedBeats,
  });
  renderSummaryBreakdown();
  setAppMessage(t("completionMessage"));
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
      title.textContent = t("questionNumber", { number: beatNumber });
      const total = document.createElement("span");
      total.className = "summary-result-total";
      total.textContent = t("questionTotal", { score: result.totalScore });
      header.append(title, total);

      const boke = document.createElement("div");
      boke.className = "summary-result-boke";
      renderLocalizedText(boke, beat.boke);

      const scoreLine = document.createElement("div");
      scoreLine.className = "score-line";
      scoreLine.append(
        createScoreChip(t("contentScore", { score: result.contentScore })),
        createScoreChip(t("timingScore", { score: result.timingScore })),
        createScoreChip(
          t("reactionSeconds", {
            seconds: result.reactionSeconds.toFixed(1),
          }),
        ),
        createScoreChip(
          t("match", { percent: Math.round(result.similarity * 100) }),
        ),
      );

      const feedback = createParagraph(result.feedback);
      feedback.className = "summary-result-feedback";
      card.append(
        header,
        boke,
        scoreLine,
        createLabeledParagraph(t("recognizedSpeechLabel"), result.transcript),
        createLabeledParagraph(t("judgedComebackLabel"), result.choiceText),
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
    launchBtn.textContent = t("presenterReadyButton");
    launchBtn.disabled = true;
    startBtn.disabled = !recognizer.supported;
    setPresenterStatus(t("presenterReady"));
  } else if (currentStatus) {
    setPresenterStatus(currentStatus === "Initializing" ? t("initializing") : currentStatus);
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
    setPresenterStatus(t("tokenRefreshed"));
  } catch (error) {
    setPresenterStatus(t("tokenRefreshFailed", { message: error.message }));
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
    launchBtn.textContent = t("reprepareAvatar");
  }
  launchBtn.disabled = config?.mock || !catalogReady || !voiceSelect.value;
  setPresenterStatus(
    voiceSelect.value
      ? t("selectionChanged")
      : t("noCompatibleVoice"),
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
  applyUiLanguage();
  recognizer.setLanguage(recognitionLanguages[speechLanguageSelect.value]);
  updateVoiceOptions();
  requirePresenterPreparation();
});

async function initializeApp() {
  applyUiLanguage();
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
      setAppMessage(t("speechRecognitionRequired"));
    }

    if (config.mock) {
      await loadCatalog();
      launchBtn.disabled = true;
      setPresenterStatus(t("mockUnavailable"));
      return;
    }

    await loadPresenterEngine(config.presenterUrl);
    await loadCatalog();
    launchBtn.disabled = false;
    setPresenterStatus(t("confirmSelections"));
  } catch (error) {
    launchBtn.disabled = true;
    startBtn.disabled = true;
    setPresenterStatus(t("initializationFailed", { message: error.message }));
    setAppMessage(t("checkServer"));
    console.error(error);
  }
}

initializeApp();
