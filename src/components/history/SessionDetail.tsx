"use client";

import { ArrowLeft, ArrowRight, User, Bot, CheckSquare } from "lucide-react";
import type { DiagnosticSession } from "@/types";

interface SessionDetailProps {
  session: DiagnosticSession;
  onBack: () => void;
  onResume?: () => void;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function SessionDetail({ session, onBack, onResume }: SessionDetailProps) {
  const isResumable = session.status !== "resolved";

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#0e0e0e]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#0e0e0e] border-b border-white/5">
        <div className="flex items-center gap-3 h-16 px-4 max-w-lg mx-auto">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-on-surface" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-headline font-bold text-sm uppercase tracking-[-0.02em] text-on-surface truncate">
              {session.equipment_brand} {session.equipment_model}
            </h1>
            <p className="text-[11px] text-outline font-headline uppercase tracking-wide">
              SN: {session.serial_number} | {formatFullDate(session.started_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pt-20 pb-28 px-4 max-w-lg mx-auto w-full">
        {/* Job Summary */}
        {session.job_summary && (
          <div className="mb-4 p-3 rounded-lg bg-primary-container/5 border border-primary-container/15">
            <h3 className="font-headline font-bold text-[11px] uppercase tracking-wide text-primary-container mb-1.5">
              Job Summary
            </h3>
            <p className="text-sm text-on-surface/90 leading-relaxed">
              {session.job_summary}
            </p>
          </div>
        )}

        {/* Conversation */}
        <div className="flex flex-col gap-3">
          {session.full_conversation.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div key={msg.id} className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                    isUser ? "bg-surface-container-high" : "bg-primary-container/15"
                  }`}
                >
                  {isUser ? (
                    <User className="w-3.5 h-3.5 text-outline" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-primary-container" />
                  )}
                </div>

                {/* Message bubble */}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2.5 ${
                    isUser
                      ? "bg-surface-container-high"
                      : "bg-surface-container-low ghost-border"
                  }`}
                >
                  <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  <span className="block text-right text-[10px] text-outline/60 mt-1.5 font-headline uppercase">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Checklist */}
        {session.checklist && (
          <div className="mt-5 p-3 rounded-lg bg-surface-container-low ghost-border">
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare className="w-4 h-4 text-primary-container" />
              <h3 className="font-headline font-bold text-[11px] uppercase tracking-wide text-primary-container">
                Checklist
              </h3>
            </div>
            <div className="flex flex-col gap-1.5">
              {session.checklist
                .split("\n")
                .filter((line) => line.trim())
                .map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-4 h-4 mt-0.5 flex-shrink-0 rounded border border-outline-variant" />
                    <span className="text-sm text-on-surface/80">
                      {line.replace(/^-\s*/, "")}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Resume Button */}
      {isResumable && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-4 pt-2 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e] to-transparent">
          <div className="max-w-lg mx-auto">
            <button
              onClick={onResume}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-primary-container font-headline font-bold text-sm uppercase tracking-wide text-[#0e0e0e] transition-all active:scale-[0.98]"
            >
              Resume Session
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
