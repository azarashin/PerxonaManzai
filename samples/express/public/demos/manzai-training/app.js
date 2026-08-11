import { evaluateResponse } from "./evaluator.js";
import { applyTranslations, translate } from "./i18n.js";
import { buildPresentationContent } from "./reaction-resolver.js";
import {
  clearProgress,
  exportProgress,
  filterScenariosByCompletion,
  isProgressStorageEnabled,
  importProgress,
  loadProgress,
  recordScenarioCompletion,
  setProgressStorageEnabled,
} from "./progress-storage.js";
import {
  scenariosForCategory,
  validateScenarioCatalog,
} from "./scenario-catalog.js";
import { ScenarioController } from "./scenario-controller.js";
import {
  resolveScenarioRoute,
  updateScenarioSearch,
} from "./scenario-routing.js";
import { scenarioDisplayLanguages } from "./scenario-languages.js";
import { SpeechRecognizer } from "./speech-recognizer.js";
import {
  createOrderedScenario,
  createReviewScenario,
} from "./training-options.js";

const avatarSelect = document.querySelector("#avatar-select");
const sceneSelect = document.querySelector("#scene-select");
const voiceSelect = document.querySelector("#voice-select");
const speechLanguageSelect = document.querySelector("#speech-language-select");
const playerLanguageSelect = document.querySelector("#player-language-select");
const categorySelect = document.querySelector("#category-select");
const scenarioSelect = document.querySelector("#scenario-select");
const answerModeSelect = document.querySelector("#answer-mode-select");
const completionFilterSelect = document.querySelector("#completion-filter-select");
const dialogueOrderSelect = document.querySelector("#dialogue-order-select");
const autoAdvanceToggle = document.querySelector("#auto-advance-toggle");
const showNativeLanguageToggle = document.querySelector("#show-native-language-toggle");
const nativeLanguageToggleLabel = document.querySelector("#native-language-toggle-label");
const progressStorageToggle = document.querySelector("#progress-storage-toggle");
const scenarioProgressList = document.querySelector("#scenario-progress-list");
const progressBtn = document.querySelector("#progress-btn");
const previewBtn = document.querySelector("#preview-btn");
const scenarioSettingsBtn = document.querySelector("#scenario-settings-btn");
const scenarioSettingsDialog = document.querySelector("#scenario-settings-dialog");
const scenarioSettingsCloseBtn = document.querySelector("#scenario-settings-close-btn");
const scenarioSettingsDoneBtn = document.querySelector("#scenario-settings-done-btn");
const previewDialog = document.querySelector("#preview-dialog");
const previewCloseBtn = document.querySelector("#preview-close-btn");
const previewDoneBtn = document.querySelector("#preview-done-btn");
const previewContent = document.querySelector("#preview-content");
const progressDialog = document.querySelector("#progress-dialog");
const progressCloseBtn = document.querySelector("#progress-close-btn");
const progressDoneBtn = document.querySelector("#progress-done-btn");
const exportProgressBtn = document.querySelector("#export-progress-btn");
const importProgressBtn = document.querySelector("#import-progress-btn");
const importProgressInput = document.querySelector("#import-progress-input");
const progressDialogStatus = document.querySelector("#progress-dialog-status");
const privacyBtn = document.querySelector("#privacy-btn");
const privacyDialog = document.querySelector("#privacy-dialog");
const privacyCloseBtn = document.querySelector("#privacy-close-btn");
const privacyDoneBtn = document.querySelector("#privacy-done-btn");
const clearProgressBtn = document.querySelector("#clear-progress-btn");
const privacyDialogStatus = document.querySelector("#privacy-dialog-status");
const launchBtn = document.querySelector("#launch-btn");
const startBtn = document.querySelector("#start-btn");
const replayBtn = document.querySelector("#replay-btn");
const nextBtn = document.querySelector("#next-btn");
const trainingMenuBtn = document.querySelector("#training-menu-btn");
const trainingRestartBtn = document.querySelector("#training-restart-btn");
const restartBtn = document.querySelector("#restart-btn");
const reviewBtn = document.querySelector("#review-btn");
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
const recognitionPanel = document.querySelector("#recognition-panel");
const scenarioTitle = document.querySelector("#scenario-title");
const scenarioDescription = document.querySelector("#scenario-description");
const scenarioPicker = document.querySelector(".scenario-picker");
const localDataActions = document.querySelector(".local-data-actions");
const trainingHeading = document.querySelector(".training-heading");
const scenarioMetadata = document.querySelector("#scenario-metadata");
const scenarioMetaChips = document.querySelector("#scenario-meta-chips");
const learningObjectives = document.querySelector("#learning-objectives");
const progressElement = document.querySelector("#progress");
const summaryElement = document.querySelector("#summary");
const summaryScore = document.querySelector("#summary-score");
const summaryDetail = document.querySelector("#summary-detail");
const summaryBreakdown = document.querySelector("#summary-breakdown");
const speechSupportWarning = document.querySelector("#speech-support-warning");
/** @type {HTMLElement & import('@perxona/presenter-types').IPresentationWidget} */
const presenter = document.querySelector("sv-presenter");

const publicBasePath =
  globalThis.__PERXONA_RUNTIME_CONFIG__?.publicBasePath ?? "";
const apiBasePath = `${publicBasePath}/api`;

let config;
let controller;
let scenarioCatalog;
let selectedScenario;
let scenarioLoadVersion = 0;
let completionRecorded = false;
let reviewRun = false;
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
  return translate(playerLanguageSelect.value, key, parameters);
}

function usesVoiceAnswer() {
  return answerModeSelect.value === "voice";
}

function canStartTraining() {
  return presenterReady && (!usesVoiceAnswer() || recognizer.supported);
}

function applyUiLanguage() {
  applyTranslations(document, playerLanguageSelect.value);
  updateNativeLanguageToggleVisibility();
  renderScenarioPicker();
  renderStoredProgress();
  renderScenarioMetadata();
  if (!scenarioTitle.classList.contains("localized-text")) {
    scenarioTitle.textContent =
      scenarioCatalog && !scenarioSelect.value ? "—" : t("scenarioLoading");
  }
  if (scenarioCatalog && !scenarioSelect.value) {
    setAppMessage(t("noScenarioAvailable"));
  }
}

function updateNativeLanguageToggleVisibility() {
  nativeLanguageToggleLabel.hidden =
    speechLanguageSelect.value === playerLanguageSelect.value;
}

function renderStoredProgress() {
  if (!scenarioCatalog) return;
  const progress = loadProgress();
  scenarioProgressList.replaceChildren(
    ...scenarioCatalog.categories.map((category) => {
      const scenarios = scenariosForCategory(scenarioCatalog, category.id);
      const section = document.createElement("section");
      section.className = "scenario-progress-category";

      const header = document.createElement("header");
      header.className = "scenario-progress-category-header";
      const title = document.createElement("h3");
      title.textContent = localizedText(
        category.title,
        playerLanguageSelect.value,
      );
      const total = document.createElement("strong");
      total.textContent = t("categoryCompletionCount", {
        count: scenarios.reduce(
          (sum, scenario) => sum + (progress.scenarios[scenario.id] ?? 0),
          0,
        ),
      });
      header.append(title, total);

      const rows = scenarios.map((scenario) => {
        const row = document.createElement("div");
        row.className = "scenario-progress-row";

        const name = document.createElement("span");
        name.textContent = localizedText(
          scenario.title,
          playerLanguageSelect.value,
        );

        const count = document.createElement("strong");
        count.textContent = t("completionCount", {
          count: progress.scenarios[scenario.id] ?? 0,
        });
        row.append(name, count);
        return row;
      });

      if (rows.length === 0) {
        const empty = document.createElement("p");
        empty.className = "scenario-progress-empty";
        empty.textContent = t("noScenarioAvailable");
        rows.push(empty);
      }
      section.append(header, ...rows);
      return section;
    }),
  );
}

function setScenarioPickerDisabled(disabled) {
  categorySelect.disabled = disabled;
  scenarioSelect.disabled = disabled;
  answerModeSelect.disabled = disabled;
  dialogueOrderSelect.disabled = disabled;
}

function setPresenterControlsDisabled(disabled) {
  speechLanguageSelect.disabled = disabled;
  playerLanguageSelect.disabled = disabled;
  avatarSelect.disabled = disabled;
  sceneSelect.disabled = disabled;
  voiceSelect.disabled = disabled;
}

function renderScenarioPicker() {
  if (!scenarioCatalog) return;

  const selectedCategoryId =
    categorySelect.value || scenarioCatalog.categories[0]?.id;
  fillSelect(
    categorySelect,
    scenarioCatalog.categories.map((category) => ({
      id: category.id,
      name: localizedText(category.title, playerLanguageSelect.value),
    })),
    selectedCategoryId,
  );
  renderScenarioOptions(scenarioSelect.value);
}

function syncScenarioUrl() {
  const search = updateScenarioSearch(
    location.search,
    categorySelect.value,
    scenarioSelect.value,
  );
  history.replaceState(null, "", `${location.pathname}${search}${location.hash}`);
}

function renderScenarioOptions(preferredId) {
  const progress = loadProgress();
  const scenarios = filterScenariosByCompletion(
    scenariosForCategory(scenarioCatalog, categorySelect.value),
    progress,
    completionFilterSelect.value,
  );
  fillSelect(
    scenarioSelect,
    scenarios.map((scenario) => ({
      id: scenario.id,
      name: t("scenarioOptionLabel", {
        title: localizedText(scenario.title, playerLanguageSelect.value),
        count: scenario.beatCount,
      }) +
        ` — ${
          progress.scenarios[scenario.id]
            ? t("completionCount", { count: progress.scenarios[scenario.id] })
            : t("notCompleted")
        }`,
    })),
    preferredId,
  );
}

function renderScenarioMetadata() {
  if (!scenarioCatalog) return;
  const entry = scenarioCatalog.scenarios.find(
    (scenario) => scenario.id === scenarioSelect.value,
  );
  if (!entry) {
    scenarioMetaChips.replaceChildren();
    learningObjectives.replaceChildren();
    return;
  }

  scenarioMetaChips.replaceChildren(
    createMetaChip(t(`difficulty_${entry.difficulty}`)),
    createMetaChip(t("estimatedMinutes", { count: entry.estimatedMinutes })),
    createMetaChip(t("dialogueCount", { count: entry.beatCount })),
  );
  learningObjectives.replaceChildren(
    ...entry.learningObjectives[playerLanguageSelect.value].map((objective) => {
      const item = document.createElement("li");
      item.textContent = objective;
      return item;
    }),
  );
}

function createMetaChip(text) {
  const chip = document.createElement("span");
  chip.className = "scenario-meta-chip";
  chip.textContent = text;
  return chip;
}

async function loadSelectedScenario() {
  const loadVersion = ++scenarioLoadVersion;
  const entry = scenarioCatalog.scenarios.find(
    (scenario) => scenario.id === scenarioSelect.value,
  );
  if (!entry) {
    clearSelectedScenario(t("noScenarioAvailable"));
    return;
  }

  setScenarioPickerDisabled(true);
  scenarioTitle.classList.remove("localized-text");
  scenarioTitle.textContent = t("scenarioLoading");
  try {
    const scenario = await requestJson(entry.path);
    if (loadVersion !== scenarioLoadVersion) return;
    controller = new ScenarioController(scenario);
    selectedScenario = scenario;
    renderLocalizedText(scenarioTitle, scenario.title);
    renderLocalizedText(scenarioDescription, scenario.description);
    renderScenarioMetadata();
    resetTrainingView();
  } catch (error) {
    if (loadVersion !== scenarioLoadVersion) return;
    clearSelectedScenario(t("scenarioLoadFailed", { message: error.message }));
    throw error;
  } finally {
    if (loadVersion === scenarioLoadVersion) setScenarioPickerDisabled(false);
  }
}

function clearSelectedScenario(message) {
  controller = undefined;
  selectedScenario = undefined;
  scenarioTitle.classList.remove("localized-text");
  scenarioTitle.textContent = "—";
  scenarioDescription.replaceChildren();
  scenarioMetaChips.replaceChildren();
  learningObjectives.replaceChildren();
  progressElement.textContent = "0 / 0";
  startBtn.disabled = true;
  setAppMessage(message);
}

function resetTrainingView() {
  clearAutoAdvance();
  recognizer.abort();
  presenter.setListening?.(false);
  presenter.interruptPresentation?.();
  phase = "setup";
  setPresenterControlsDisabled(false);
  setTrainingFocus(false);
  responseArea.hidden = true;
  summaryElement.hidden = true;
  instructions.hidden = false;
  bokeCaption.hidden = true;
  replayBtn.hidden = true;
  nextBtn.hidden = true;
  trainingMenuBtn.hidden = true;
  trainingRestartBtn.hidden = true;
  restartBtn.hidden = true;
  reviewBtn.hidden = true;
  startBtn.hidden = false;
  startBtn.disabled = !canStartTraining();
  progressElement.textContent = `0 / ${selectedScenario.beats.length}`;
}

function setTrainingFocus(active) {
  scenarioPicker.hidden = active;
  localDataActions.hidden = active;
  trainingHeading.hidden = active;
  scenarioDescription.hidden = active;
  scenarioMetadata.hidden = active;
  instructions.hidden = active;
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

function requestApiJson(path, options = {}) {
  const apiPath = path.startsWith("/") ? path : `/${path}`;
  return requestJson(`${apiBasePath}${apiPath}`, options);
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

  const { items = [] } = await requestApiJson(
    `/avatars/${encodeURIComponent(avatarId)}/motions`,
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
      requestApiJson("/avatars"),
      requestApiJson("/scenes"),
      requestApiJson("/voices"),
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
      await requestApiJson("/connect-token");
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
      const row = document.createElement("button");
      row.type = "button";
      row.className = "choice";
      row.dataset.choiceId = choice.id;
      row.disabled = usesVoiceAnswer();
      row.addEventListener("click", () => handleChoiceSelection(choice));

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
  const visibleLanguages = scenarioDisplayLanguages(
    speechLanguageSelect.value,
    playerLanguageSelect.value,
    showNativeLanguageToggle.checked,
  );
  element.classList.add("localized-text");
  element.replaceChildren(
    ...displayLanguages
      .filter(({ key }) => visibleLanguages.includes(key))
      .sort(
        (left, right) =>
          visibleLanguages.indexOf(left.key) - visibleLanguages.indexOf(right.key),
      )
      .map(({ key, label, lang }) => {
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
  reviewBtn.hidden = true;
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
  recognitionPanel.hidden = !usesVoiceAnswer();
  if (!usesVoiceAnswer()) {
    phaseLabel.textContent = t("selectOneResponse");
    presenter.setListening?.(false);
    micBtn.hidden = true;
    setAppMessage(t("selectDisplayedResponse"));
    return;
  }

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
    controller.scenario.evaluationAxes,
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

  completeEvaluation(result);
}

function handleChoiceSelection(choice) {
  if (phase !== "answering" || usesVoiceAnswer()) return;

  const answer = localizedText(choice.text, speechLanguageSelect.value);
  const reactionSeconds = Math.max(
    0,
    (performance.now() - responseWindowStartedAt) / 1000,
  );
  const result = evaluateResponse(
    controller.currentBeat,
    answer,
    reactionSeconds,
    speechLanguageSelect.value,
    controller.scenario.evaluationAxes,
  );
  result.inputMode = "click";
  completeEvaluation(result);
}

function completeEvaluation(result) {

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
    !controller.hasNext
      ? t("viewResults")
      : t("nextBoke");
  const delaySeconds = AUTO_ADVANCE_DELAY_MS / 1000;
  nextBtn.textContent = t("autoAdvanceLabel", {
    action: nextAction,
    seconds: delaySeconds,
  });
  if (autoAdvanceToggle.checked) {
    setAppMessage(
      t("scoreExplanation", { action: nextAction, seconds: delaySeconds }),
    );
    scheduleAutoAdvance();
  } else {
    nextBtn.textContent = nextAction;
    setAppMessage(t("manualAdvanceMessage"));
  }
}

function showEvaluation(result) {
  const scoreLine = document.createElement("div");
  scoreLine.className = "score-line";
  scoreLine.append(
    createScoreChip(t("contentScore", { score: result.contentScore })),
    ...createAxisScoreChips(result.axisScores),
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

function createAxisScoreChips(axisScores = []) {
  return axisScores.map((axis) =>
    createScoreChip(
      t("axisScore", {
        label: axis.label,
        score: axis.score,
        maximum: axis.maxPoints,
      }),
    ),
  );
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
  if (!canStartTraining()) return;

  clearAutoAdvance();
  setTrainingFocus(true);
  completionRecorded = false;
  reviewRun = false;
  setScenarioPickerDisabled(true);
  setPresenterControlsDisabled(true);
  controller = new ScenarioController(
    createOrderedScenario(selectedScenario, dialogueOrderSelect.value),
  );
  controller.start();
  startBtn.hidden = true;
  trainingMenuBtn.hidden = false;
  trainingRestartBtn.hidden = false;
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
  trainingMenuBtn.hidden = false;
  trainingRestartBtn.hidden = true;
  restartBtn.hidden = false;
  reviewBtn.hidden = reviewRun || controller.resultDetails.length === 0;
  setScenarioPickerDisabled(false);
  setPresenterControlsDisabled(false);
  const summary = controller.summary;
  progressElement.textContent = `${summary.completedBeats} / ${summary.completedBeats}`;
  if (!completionRecorded && !reviewRun) {
    recordScenarioCompletion(selectedScenario.id);
    completionRecorded = true;
    renderStoredProgress();
    renderScenarioOptions();
  }
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
        ...createAxisScoreChips(result.axisScores),
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
    startBtn.disabled = !canStartTraining();
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
      await requestApiJson("/connect-token");
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
trainingMenuBtn.addEventListener("click", returnToTrainingMenu);
trainingRestartBtn.addEventListener("click", restartCurrentTraining);
restartBtn.addEventListener("click", startTraining);
reviewBtn.addEventListener("click", startReviewTraining);

function startReviewTraining() {
  const reviewScenario = createReviewScenario(
    selectedScenario,
    controller.resultDetails,
  );
  if (reviewScenario.beats.length === 0 || !canStartTraining()) return;

  clearAutoAdvance();
  reviewRun = true;
  completionRecorded = true;
  setScenarioPickerDisabled(true);
  setPresenterControlsDisabled(true);
  controller = new ScenarioController(reviewScenario);
  controller.start();
  startBtn.hidden = true;
  trainingMenuBtn.hidden = false;
  trainingRestartBtn.hidden = false;
  restartBtn.hidden = true;
  reviewBtn.hidden = true;
  void playCurrentBeat();
}

function returnToTrainingMenu() {
  resetTrainingView();
  setScenarioPickerDisabled(false);
  setPresenterControlsDisabled(false);
  setAppMessage("");
}

function restartCurrentTraining() {
  clearAutoAdvance();
  recognizer.abort();
  presenter.setListening?.(false);
  presenter.interruptPresentation?.();
  startTraining();
}

previewBtn.addEventListener("click", () => {
  scenarioSettingsDialog.close();
  renderScenarioPreview();
  previewDialog.showModal();
});

for (const button of [previewCloseBtn, previewDoneBtn]) {
  button.addEventListener("click", () => previewDialog.close());
}

previewDialog.addEventListener("click", (event) => {
  if (event.target === previewDialog) previewDialog.close();
});

function renderScenarioPreview() {
  if (!selectedScenario) {
    previewContent.replaceChildren(createParagraph(t("noScenarioAvailable")));
    return;
  }

  previewContent.replaceChildren(
    ...selectedScenario.beats.map((beat, beatIndex) => {
      const card = document.createElement("article");
      card.className = "preview-beat";
      const heading = document.createElement("h3");
      heading.textContent = t("questionNumber", { number: beatIndex + 1 });
      const boke = document.createElement("div");
      renderLocalizedText(boke, beat.boke);
      const reaction = createParagraph(
        t("previewReaction", {
          description: localizedText(
            beat.reaction.description,
    playerLanguageSelect.value,
          ),
          tags: beat.reaction.motionTags.join(", "),
        }),
      );
      reaction.className = "preview-reaction";
      card.append(heading, boke, reaction);

      for (const choice of beat.choices) {
        const choiceElement = document.createElement("section");
        choiceElement.className = "preview-choice";
        const score = document.createElement("strong");
        const axisScores = controller.scenario.evaluationAxes.map((axis) => ({
          label: localizedText(axis.label, playerLanguageSelect.value),
          score: choice.axisScores[axis.id],
          maxPoints: axis.maxPoints,
        }));
        score.textContent = t("previewChoiceScore", {
          score: axisScores.reduce((total, axis) => total + axis.score, 0),
        });
        const text = document.createElement("div");
        renderLocalizedText(text, choice.text);
        const feedback = document.createElement("div");
        renderLocalizedText(feedback, choice.feedback);
        const axisLine = document.createElement("div");
        axisLine.className = "score-line";
        axisLine.append(...createAxisScoreChips(axisScores));
        choiceElement.append(score, axisLine, text, feedback);
        card.append(choiceElement);
      }
      return card;
      }),
  );
}

answerModeSelect.addEventListener("change", () => {
  startBtn.disabled = !canStartTraining();
  speechSupportWarning.hidden = !usesVoiceAnswer() || recognizer.supported;
  setAppMessage(
    usesVoiceAnswer() ? t("voiceAnswerSelected") : t("clickAnswerSelected"),
  );
});

showNativeLanguageToggle.addEventListener("change", () => {
  if (!selectedScenario) return;
  renderLocalizedText(scenarioTitle, selectedScenario.title);
  renderLocalizedText(scenarioDescription, selectedScenario.description);
});

completionFilterSelect.addEventListener("change", () => {
  renderScenarioOptions(scenarioSelect.value);
  void loadSelectedScenario().catch(console.error);
});

progressBtn.addEventListener("click", () => {
  scenarioSettingsDialog.close();
  renderStoredProgress();
  progressDialogStatus.textContent = "";
  progressDialog.showModal();
});

scenarioSettingsBtn.addEventListener("click", () => {
  scenarioSettingsDialog.showModal();
});

for (const button of [scenarioSettingsCloseBtn, scenarioSettingsDoneBtn]) {
  button.addEventListener("click", () => scenarioSettingsDialog.close());
}

scenarioSettingsDialog.addEventListener("click", (event) => {
  if (event.target === scenarioSettingsDialog) scenarioSettingsDialog.close();
});

for (const button of [progressCloseBtn, progressDoneBtn]) {
  button.addEventListener("click", () => progressDialog.close());
}

progressDialog.addEventListener("click", (event) => {
  if (event.target === progressDialog) progressDialog.close();
});

exportProgressBtn.addEventListener("click", () => {
  const blob = new Blob([exportProgress()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "perxona-training-progress.json";
  link.click();
  URL.revokeObjectURL(url);
  progressDialogStatus.textContent = t("progressExported");
});

importProgressBtn.addEventListener("click", () => importProgressInput.click());

importProgressInput.addEventListener("change", async () => {
  const [file] = importProgressInput.files;
  importProgressInput.value = "";
  if (!file) return;
  try {
    importProgress(await file.text());
    renderStoredProgress();
    renderScenarioOptions(scenarioSelect.value);
    progressDialogStatus.textContent = t("progressImported");
  } catch (error) {
    progressDialogStatus.textContent = t("progressImportFailed", {
      message: error.message,
    });
  }
});

privacyBtn.addEventListener("click", () => {
  privacyDialogStatus.textContent = "";
  privacyDialog.showModal();
});

for (const button of [privacyCloseBtn, privacyDoneBtn]) {
  button.addEventListener("click", () => privacyDialog.close());
}

privacyDialog.addEventListener("click", (event) => {
  if (event.target === privacyDialog) privacyDialog.close();
});

progressStorageToggle.addEventListener("change", () => {
  const saved = setProgressStorageEnabled(progressStorageToggle.checked);
  if (!saved) {
    progressStorageToggle.checked = isProgressStorageEnabled();
    setAppMessage(t("progressStorageUnavailable"));
    return;
  }
  setAppMessage(
    t(
      progressStorageToggle.checked
        ? "progressStorageEnabled"
        : "progressStorageDisabled",
    ),
  );
});

clearProgressBtn.addEventListener("click", () => {
  if (clearProgress()) {
    renderStoredProgress();
    renderScenarioOptions(scenarioSelect.value);
    privacyDialogStatus.textContent = t("progressCleared");
  } else {
    privacyDialogStatus.textContent = t("progressStorageUnavailable");
  }
});

categorySelect.addEventListener("change", () => {
  renderScenarioOptions();
  syncScenarioUrl();
  void loadSelectedScenario().catch(console.error);
});

scenarioSelect.addEventListener("change", () => {
  syncScenarioUrl();
  void loadSelectedScenario().catch(console.error);
});

function requirePresenterPreparation() {
  clearAutoAdvance();
  setScenarioPickerDisabled(false);
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
  updateNativeLanguageToggleVisibility();
  recognizer.setLanguage(recognitionLanguages[speechLanguageSelect.value]);
  updateVoiceOptions();
  requirePresenterPreparation();
  if (selectedScenario) {
    renderLocalizedText(scenarioTitle, selectedScenario.title);
    renderLocalizedText(scenarioDescription, selectedScenario.description);
  }
});

playerLanguageSelect.addEventListener("change", () => {
  applyUiLanguage();
  if (selectedScenario) {
    renderLocalizedText(scenarioTitle, selectedScenario.title);
    renderLocalizedText(scenarioDescription, selectedScenario.description);
    resetTrainingView();
  }
});

async function initializeApp() {
  applyUiLanguage();
  try {
    const [loadedConfig, loadedScenarioCatalog] = await Promise.all([
      requestApiJson("/config"),
      requestJson("./scenarios/index.json"),
    ]);
    config = loadedConfig;
    scenarioCatalog = validateScenarioCatalog(loadedScenarioCatalog);
    progressStorageToggle.checked = isProgressStorageEnabled();
    renderScenarioPicker();
    const initialRoute = resolveScenarioRoute(scenarioCatalog, location.search);
    categorySelect.value = initialRoute.categoryId;
    renderScenarioOptions(initialRoute.scenarioId);
    syncScenarioUrl();
    renderStoredProgress();
    await loadSelectedScenario();
    if (initialRoute.usedFallback) setAppMessage(t("invalidScenarioLink"));

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
