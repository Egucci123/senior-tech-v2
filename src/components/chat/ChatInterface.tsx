"use client";

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Wrench, Camera, ArrowUp, RotateCcw, ClipboardList, Loader2, X, Copy, Check, ScanLine } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import ChatMessage from "./ChatMessage";
import FlagButton from "./FlagButton";
import SafetyGate from "./SafetyGate";
import VoiceInput from "./VoiceInput";
import QuickReferenceDrawer from "../calculators/QuickReferenceDrawer";
import ErrorBoundary from "@/components/ErrorBoundary";
import type { User, DiagnosticSession } from "@/types";

/* ── Public handle exposed to parent via ref ── */
export interface ChatInterfaceHandle {
  loadSession: (session: DiagnosticSession) => void;
}

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

interface ChatInterfaceProps {
  user?: User | null;
}

/* ── Service Notes Modal ── */
interface SummaryModalProps {
  notes: string;
  onClose: () => void;
}

function SummaryModal({ notes, onClose }: SummaryModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(notes);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }, [notes]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-0 pb-0">
      <div className="bg-surface-container-low ghost-border rounded-t-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-outline-variant/20">
          <span className="font-headline font-bold text-xs uppercase tracking-widest text-primary-container">
            SERVICE NOTES
          </span>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-3">
            COPY INTO YOUR WORK ORDER
          </p>
          <p className="font-body text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
            {notes}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-outline-variant/20">
          <button
            onClick={handleCopy}
            className="w-full h-11 rounded-lg bg-primary-container text-on-primary-container
                       font-headline font-bold text-xs uppercase tracking-wider
                       flex items-center justify-center gap-2
                       hover:brightness-110 active:scale-[0.98] transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                COPIED
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                COPY TO CLIPBOARD
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const ChatInterface = forwardRef<ChatInterfaceHandle, ChatInterfaceProps>(
function ChatInterface({ user }, ref) {
  const {
    messages,
    sessionState,
    currentSessionId,
    isLoading,
    safetyGateOpen,
    pendingPhotoMessageId,
    sendMessage,
    confirmSafety,
    newDiagnostic,
    loadSession,
  } = useChat(user ?? null);

  useImperativeHandle(ref, () => ({ loadSession }), [loadSession]);

  const [input, setInput] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryModal, setSummaryModal] = useState<string | null>(null);

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
      const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
      if (!ALLOWED_MIME.includes(file.type)) {
        alert("Only JPEG, PNG, WebP, or HEIC photos are supported.");
        e.target.value = "";
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert("Photo must be under 10MB.");
        e.target.value = "";
        return;
      }
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

  const handleSummarize = useCallback(async () => {
    if (summaryLoading || messages.length === 0) return;

    setSummaryLoading(true);
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 15000);
    try {
      const conversation = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation }),
        signal: abort.signal,
      });

      const data = res.ok ? await res.json() : { result: "" };
      setSummaryModal(data.result || "");
    } catch {
      /* noop — timeout or network error */
    } finally {
      clearTimeout(timeout);
      setSummaryLoading(false);
    }
  }, [messages, summaryLoading]);

  const hasMessages = messages.length > 0;

  return (
    <ErrorBoundary>
    <div className="flex flex-col h-full bg-[#0e0e0e]">
      <SafetyGate isOpen={safetyGateOpen} onConfirm={confirmSafety} />
      <QuickReferenceDrawer />

      {summaryModal && (
        <SummaryModal
          notes={summaryModal}
          onClose={() => setSummaryModal(null)}
        />
      )}

      {/* ── Chat Header Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0e0e0e]">
        <div className="w-10" />
        <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline">
          DIAGNOSTIC SESSION
        </span>
        <button
          onClick={() => {
            newDiagnostic();
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                     bg-surface-container-high border border-outline-variant/20
                     font-headline font-bold text-[10px] uppercase tracking-wider text-primary
                     hover:border-primary-container/40 transition-colors
                     min-h-[44px] flex items-center"
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
                  What are you working on?
                </p>
              </div>
              <p className="text-[10px] font-headline uppercase tracking-wider text-outline mt-1.5 ml-3">
                SENIOR_TECH_AI
              </p>
            </div>
          </div>
        )}

        {/* Message list */}
        {hasMessages &&
          messages.map((msg) => {
            const chips =
              msg.role === "assistant" ? parseResponseChips(msg.content) : [];

            /* While a photo response is streaming, show a clean "Analyzing..." card
               instead of the raw streaming content (tags, partial text, etc.) */
            const isPhotoAnalyzing =
              msg.role === "assistant" &&
              msg.id === pendingPhotoMessageId &&
              isLoading;

            return (
              <div key={msg.id}>
                {isPhotoAnalyzing ? (
                  <div className="flex justify-start mb-4">
                    <div>
                      <div className="border-l-[3px] border-primary-container bg-surface-container-low rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 text-primary-container">
                          <ScanLine className="w-4 h-4 animate-pulse" />
                          <span className="font-headline font-bold text-xs uppercase tracking-wider">
                            Reading data plate...
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ChatMessage message={msg} />
                )}

                {msg.role === "assistant" && (
                  <FlagButton
                    messageContent={msg.content}
                    userId={user?.id}
                    sessionId={currentSessionId ?? undefined}
                    brand={sessionState?.equipment?.brand}
                    model={sessionState?.equipment?.model}
                    serial={sessionState?.equipment?.serial_number}
                  />
                )}

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

        {/* Typing indicator — hidden during photo analysis (handled by the message placeholder) */}
        {isLoading && !pendingPhotoMessageId && (
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
                       hover:text-on-surface transition-colors min-h-[44px]"
            aria-label="Attach photo"
          >
            <Camera className="w-4 h-4" />
            PHOTO
          </button>
          <VoiceInput onTranscript={handleVoiceTranscript} />
          <button
            onClick={handleSummarize}
            disabled={summaryLoading || !hasMessages}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg
                       bg-surface-container-high font-headline font-bold text-[10px]
                       uppercase tracking-wider text-outline
                       hover:text-on-surface transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
            aria-label="Summarize diagnostic"
          >
            {summaryLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ClipboardList className="w-4 h-4" />
            )}
            SUMMARIZE
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
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
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg
                       px-4 py-3 font-body text-sm text-on-surface
                       placeholder:font-headline placeholder:font-bold placeholder:text-[11px]
                       placeholder:uppercase placeholder:tracking-wider placeholder:text-outline/70
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
    </ErrorBoundary>
  );
});

ChatInterface.displayName = "ChatInterface";

export default ChatInterface;
