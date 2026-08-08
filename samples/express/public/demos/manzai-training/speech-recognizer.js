export class SpeechRecognizer {
  constructor({ onInterim, onFinal, onError, onEnd }) {
    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    this.supported = Boolean(Recognition);
    this.active = false;
    this.receivedFinalResult = false;
    this.stopTimer = null;

    if (!Recognition) return;

    this.recognition = new Recognition();
    this.recognition.lang = "ja-JP";
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 5;

    this.recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript ?? "";
        if (event.results[index].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) onInterim(interimTranscript.trim());
      if (finalTranscript) {
        this.receivedFinalResult = true;
        onFinal(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error !== "aborted") onError(event.error);
    };

    this.recognition.onend = () => {
      this.active = false;
      this.clearTimer();
      onEnd(this.receivedFinalResult);
    };
  }

  start(timeoutMilliseconds = 9000) {
    if (!this.supported) {
      throw new Error("このブラウザーは音声認識に対応していません。");
    }
    if (this.active) return;

    this.receivedFinalResult = false;
    this.active = true;
    try {
      this.recognition.start();
      this.stopTimer = window.setTimeout(() => this.stop(), timeoutMilliseconds);
    } catch (error) {
      this.active = false;
      this.clearTimer();
      throw error;
    }
  }

  stop() {
    if (this.active) this.recognition.stop();
  }

  abort() {
    if (this.active) this.recognition.abort();
    this.active = false;
    this.clearTimer();
  }

  clearTimer() {
    if (this.stopTimer !== null) {
      window.clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
  }
}
