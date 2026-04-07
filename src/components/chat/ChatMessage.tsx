"use client";

import type { ChatMessage as ChatMessageType } from "@/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isAI = message.role === "assistant";

  return (
    <div
      className={`flex w-full ${isAI ? "justify-start" : "justify-end"} mb-4`}
    >
      <div
        className={`max-w-[85%] ${
          isAI
            ? "border-l-[3px] border-primary-container bg-surface-container-low"
            : "bg-surface-container-high"
        } rounded-lg p-3`}
      >
        {/* Image attachment */}
        {message.image_url && (
          <div className="mb-2 rounded overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.image_url}
              alt="Attached photo"
              className="w-full h-auto object-cover rounded max-h-64"
            />
          </div>
        )}

        {/* Message content */}
        <p className="font-body text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>

        {/* Timestamp */}
        <p
          className={`font-headline font-bold text-[10px] uppercase tracking-wider mt-2 ${
            isAI ? "text-outline" : "text-outline"
          }`}
        >
          {formatTimestamp(message.timestamp)}
          {isAI ? " \u2022 SENIOR_TECH_AI" : " \u2022 TECH_ID_882"}
        </p>
      </div>
    </div>
  );
}
