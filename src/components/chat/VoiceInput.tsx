"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Mic } from "lucide-react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
}

/* HVAC terminology corrections */
const CORRECTIONS: [RegExp, string][] = [
  [/\bfreon\b/gi, "refrigerant"],
  [/\bcondensor\b/gi, "condenser"],
  [/\bcompacity\b/gi, "capacity"],
  [/\bcompresser\b/gi, "compressor"],
  [/\bsuperheat(?:ed)?\s+sub\s*cool/gi, "superheat and subcooling"],
  [/\bcontacter\b/gi, "contactor"],
  [/\bcapaciter\b/gi, "capacitor"],
  [/\breciever\b/gi, "receiver"],
  [/\breciver\b/gi, "receiver"],
];

function correctHVACTerms(text: string): string {
  let corrected = text;
  for (const [pattern, replacement] of CORRECTIONS) {
    corrected = corrected.replace(pattern, replacement);
  }
  return corrected;
}

export default function VoiceInput({ onTranscript }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) {
        onTranscript(correctHVACTerms(transcript));
      }
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
  }, [onTranscript]);

  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  }, [isRecording]);

  /* If Web Speech API is not supported, render nothing (silent fallback) */
  if (!isSupported) return null;

  return (
    <button
      onClick={toggleRecording}
      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg
                  font-headline font-bold text-[10px] uppercase tracking-wider
                  transition-all duration-200 ${
                    isRecording
                      ? "bg-red-500/20 text-red-400 border border-red-500/40"
                      : "bg-surface-container-high text-outline hover:text-on-surface border border-transparent"
                  }`}
      aria-label={isRecording ? "Stop recording" : "Start voice input"}
    >
      <div className="relative">
        <Mic className="w-4 h-4" />
        {isRecording && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>
      VOICE
    </button>
  );
}
