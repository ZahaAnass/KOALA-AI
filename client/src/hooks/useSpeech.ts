import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

function getRecognition(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Browser speech-to-text via the Web Speech API (Chrome, Edge, Safari). */
export function useSpeechInput(lang: string, onTranscript: (text: string, final: boolean) => void) {
  const supported = typeof window !== "undefined" && getRecognition() !== null;
  const [listening, setListening] = useState(false);
  const ref = useRef<SpeechRecognitionLike | null>(null);

  const stop = useCallback(() => {
    ref.current?.stop();
    ref.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor) return;
    stop();
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = "";
      let final = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]!;
        text += result[0]?.transcript ?? "";
        if ((result as unknown as { isFinal?: boolean }).isFinal) final = true;
      }
      onTranscript(text, final);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    ref.current = rec;
    setListening(true);
  }, [lang, onTranscript, stop]);

  useEffect(() => stop, [stop]);

  return { supported, listening, start, stop, toggle: () => (listening ? stop() : start()) };
}

/** Text-to-speech playback with a single shared utterance. */
export function useSpeechOutput(lang: string) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  // Mirrors `speakingId` so `speak` keeps a stable identity (it is passed to memoized messages).
  const speakingRef = useRef<string | null>(null);
  speakingRef.current = speakingId;

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, [supported]);

  const speak = useCallback(
    (id: string, text: string) => {
      if (!supported) return;
      if (speakingRef.current === id) return stop();
      window.speechSynthesis.cancel();
      const clean = text.replace(/```[\s\S]*?```/g, " code block ").replace(/[*_#>`|]/g, "");
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = lang;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      window.speechSynthesis.speak(utterance);
      setSpeakingId(id);
    },
    [lang, stop, supported],
  );

  useEffect(() => stop, [stop]);

  return { supported, speakingId, speak, stop };
}
