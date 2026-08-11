export function completionAnswerDetails(result) {
  const details = [];

  if (result.inputMode !== "click") {
    details.push({
      labelKey: "recognizedSpeechLabel",
      value: result.transcript,
    });
  }

  details.push({
    labelKey: "answeredContentLabel",
    value: result.choiceText,
  });

  return details;
}
