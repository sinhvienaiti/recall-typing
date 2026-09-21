import type { RecallSettings } from "../types";

function notifyParentSpeech(active: boolean): void {
  window.parent?.postMessage(
    { type: "typing-game:speech", active },
    "*",
  );
}

function preferredVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  const exact = voices.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase());
  if (exact !== undefined) return exact;
  const base = lang.split("-")[0]?.toLowerCase() ?? "en";
  return voices.find((voice) => voice.lang.toLowerCase().startsWith(base)) ?? null;
}

export function speakEnglish(text: string, settings: RecallSettings): void {
  if (!("speechSynthesis" in window)) return;
  // Keep the current utterance alive and queue this one behind it. Cancelling
  // immediately before speak() can make rapid consecutive words disappear.
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = settings.accent;
  utterance.rate = settings.speechRate;
  utterance.volume = settings.speechVolume;
  const voice = preferredVoice(settings.accent);
  if (voice !== null) utterance.voice = voice;
  utterance.onstart = () => notifyParentSpeech(true);
  utterance.onend = () => notifyParentSpeech(false);
  utterance.onerror = () => notifyParentSpeech(false);
  speechSynthesis.speak(utterance);
}

export function stopSpeech(): void {
  notifyParentSpeech(false);
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}
