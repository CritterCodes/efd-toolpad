'use client';
/**
 * Dictation via the browser's built-in speech recognition (Web Speech API).
 *
 * No server, no key, no audio leaves the page except to the browser vendor's own recognizer.
 * Supported in Chrome/Edge (desktop + Android) and Safari (macOS, iOS 14.5+); not in Firefox,
 * and only on a secure origin — callers hide the control when `supported` is false.
 *
 *   const { supported, listening, interim, error, start, stop, toggle } = useSpeechDictation({
 *     onFinal: (text) => append(text),   // each finished phrase, trimmed
 *   });
 *
 * `interim` is the phrase still being recognized (show it live, don't store it). Recognition
 * ends by itself after a silence on most engines; `onEnd({ byUser })` tells the caller whether
 * the user tapped stop (so they can e.g. run analysis) or the engine gave up.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const ERROR_COPY = {
  'not-allowed': 'Microphone access was blocked. Allow the mic for this site and try again.',
  'service-not-allowed': 'Speech recognition is not allowed in this browser.',
  'audio-capture': 'No microphone was found.',
  network: 'Speech recognition needs a network connection.',
  'no-speech': '', // silence — not worth an alert
  aborted: '',
};

function getRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  if (window.isSecureContext === false) return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function useSpeechDictation({ onFinal, onEnd, lang = 'en-US' } = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const byUserRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  const onEndRef = useRef(onEnd);
  onFinalRef.current = onFinal;
  onEndRef.current = onEnd;

  useEffect(() => {
    setSupported(Boolean(getRecognitionCtor()));
    return () => {
      try { recognitionRef.current?.abort(); } catch { /* already gone */ }
    };
  }, []);

  const stop = useCallback(() => {
    byUserRef.current = true;
    try { recognitionRef.current?.stop(); } catch { /* not running */ }
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) { setError(ERROR_COPY['service-not-allowed']); return; }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => { byUserRef.current = false; setError(''); setInterim(''); setListening(true); };
    rec.onresult = (event) => {
      let live = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = String(result[0]?.transcript || '');
        if (result.isFinal) {
          const finalText = transcript.trim();
          if (finalText) onFinalRef.current?.(finalText);
        } else {
          live += transcript;
        }
      }
      setInterim(live.trim());
    };
    rec.onerror = (event) => {
      const copy = ERROR_COPY[event?.error];
      if (copy) setError(copy);
      else if (copy === undefined) setError(`Speech recognition failed (${event?.error || 'unknown'}).`);
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
      recognitionRef.current = null;
      onEndRef.current?.({ byUser: byUserRef.current });
      byUserRef.current = false;
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      setError(`Could not start the microphone: ${e?.message || e}`);
      recognitionRef.current = null;
    }
  }, [lang]);

  const toggle = useCallback(() => { if (listening) stop(); else start(); }, [listening, start, stop]);

  return { supported, listening, interim, error, start, stop, toggle };
}
