"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Wrench, Camera, ArrowUp, RotateCcw } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import ChatMessage from "./ChatMessage";
import SafetyGate from "./SafetyGate";
import VoiceInput from "./VoiceInput";
import QuickReferenceDrawer from "../calculators/QuickReferenceDrawer";

/* ── Response chips that can appear after AI messages ── */
interface ResponseChip {
  label: string;
}

function parseResponseChips(content: string): ResponseChip[] {
  const match = content.match(/\[([A-Z\s|]+)\]\s*$/);
  if (!match) return [];
  return match[1]
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((label) => ({ label }));
}

export default function ChatInterface() {
  const {
    messages,
    isLoading,
    safetyGateOpen,
    sendMessage,
    confirmSafety,
    newDiagnostic,
  } = useChat();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    sendMessage(trimmed);
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleVoiceTranscript = useCallback((text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
    inputRef.current?.focus();
  }, []);

  const handlePhotoClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const caption = input.trim() || "Photo attached";
      setInput("");
      sendMessage(caption, url);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [input, sendMessage]
  );

  const handleChipClick = useCallback(
    (label: string) => {
      if (isLoading) return;
      sendMessage(label);
    },
    [isLoading, sendMessage]
  );

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full bg-[#0e0e0e]">
      <SafetyGate isOpen={safetyGateOpen} onConfirm={confirmSafety} />
      <QuickReferenceDrawer />

      {/* ── Chat Header Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0e0e0e]">
        <div className="w-10" />
        <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline">
          DIAGNOSTIC SESSION
        </span>
        <button
          onClick={newDiagnostic}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                     bg-surface-container-high border border-outline-variant/20
                     font-headline font-bold text-[10px] uppercase tracking-wider text-primary
                     hover:border-primary-container/40 transition-colors"
          aria-label="New Diagnostic"
        >
          <RotateCcw className="w-3 h-3" />
          NEW
        </button>
      </div>

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Empty state: photo-first intro */}
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            {/* Hex wrench icon */}
            <div className="w-20 h-20 clip-hex bg-surface-container-high flex items-center justify-center mb-4">
              <Wrench className="w-8 h-8 text-primary-container" />
            </div>

            <h1 className="font-headline font-bold text-2xl uppercase text-primary-container tracking-tight mb-1">
              SENIOR TECH
            </h1>
            <p className="font-headline font-bold text-[11px] uppercase text-outline tracking-widest mb-8">
              20 YEARS FIELD EXPERIENCE
            </p>

            {/* Senior Tech intro message */}
            <div className="w-full max-w-sm mb-6">
              <div className="border-l-[3px] border-primary-container bg-surface-container-low rounded-lg px-4 py-4">
                <p className="font-body text-sm text-on-surface leading-relaxed">
                  Snap a photo of the data plate and tell me what it&apos;s doing. I&apos;ll pull up
                  everything I know about the unit and find the manuals for you.
                </p>
              </div>
              <p className="text-[10px] font-headline uppercase tracking-wider text-outline mt-1.5 ml-3">
                SENIOR_TECH_AI
              </p>
            </div>

            {/* Prominent upload button */}
            <button
              onClick={handlePhotoClick}
              className="flex items-center gap-2 px-6 py-3.5 rounded-lg
                         bg-primary-container text-on-primary-container
                         font-headline font-bold text-sm uppercase tracking-wider
                         hover:brightness-110 active:scale-[0.97] transition-all mb-3"
            >
              <Camera className="w-5 h-5" />
              UPLOAD DATA PLATE
            </button>

            <p className="font-body text-xs text-outline">
              Or describe the issue below
            </p>
          </div>
        )}

        {/* Message list */}
        {hasMessages &&
          messages.map((msg) => {
            const chips =
              msg.role === "assistant" ? parseResponseChips(msg.content) : [];

            return (
              <div key={msg.id}>
                <ChatMessage message={msg} />

                {chips.length > 0 && (
                  <div className="flex flex-wrap gap-2 ml-3 mb-4">
                    {chips.map((chip) => (
                      <button
                        key={chip.label}
                        onClick={() => handleChipClick(chip.label)}
                        className="px-3 py-1.5 rounded-lg border border-primary-container/30
                                   bg-surface-container-low font-headline font-bold text-[10px]
                                   uppercase tracking-wider text-primary
                                   hover:bg-primary-container/10 hover:border-primary-container/50
                                   active:scale-[0.97] transition-all duration-150"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="border-l-[3px] border-primary-container bg-surface-container-low rounded-lg px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-primary-container rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-primary-container rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-primary-container rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="border-t border-white/5 bg-[#0e0e0e] px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={handlePhotoClick}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg
                       bg-surface-container-high font-headline font-bold text-[10px]
                       uppercase tracking-wider text-outline
                       hover:text-on-surface transition-colors"
            aria-label="Attach photo"
          >
            <Camera className="w-4 h-4" />
            PHOTO
          </button>
          <VoiceInput onTranscript={handleVoiceTranscript} />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="DESCRIBE THE ISSUE..."
            className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg
                       px-4 py-3 font-body text-sm text-on-surface
                       placeholder:font-headline placeholder:font-bold placeholder:text-[11px]
                       placeholder:uppercase placeholder:tracking-wider placeholder:text-outline/50
                       focus:outline-none focus:border-primary-container transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`w-11 h-11 flex-shrink-0 rounded-lg flex items-center justify-center transition-all duration-200 ${
              input.trim() && !isLoading
                ? "bg-primary-container text-on-primary-container hover:brightness-110 active:scale-[0.95]"
                : "bg-surface-container-high text-outline cursor-not-allowed"
            }`}
            aria-label="Send message"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
