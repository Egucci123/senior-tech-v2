"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessage, SessionState, User } from "@/types";
import { addManual } from "./useManuals";
import {
  createDiagnosticSession,
  updateDiagnosticSession,
  endDiagnosticSession,
  createManualSearch,
  logSafetyAcknowledgment,
} from "@/lib/supabase";

/* ── Convert a blob URL to base64, resizing to max 1024px ── */
async function blobUrlToBase64(blobUrl: string): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    const mediaType = blob.type || "image/jpeg";

    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          } else {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, mediaType: "image/jpeg" });
      };
      img.onerror = () => resolve(null);
      img.src = objectUrl;
    });
  } catch {
    return null;
  }
}

/* ── Safety-gate trigger phrases ── */
const SAFETY_TRIGGERS = [
  "live voltage",
  "energized",
  "power on",
  "with power",
  "measure voltage at",
  "check voltage at",
  "meter on",
];

function containsSafetyTrigger(text: string): string | null {
  const lower = text.toLowerCase();
  return SAFETY_TRIGGERS.find((phrase) => lower.includes(phrase)) || null;
}

/* ── Model routing ── */
type RequestType = "photo" | "complex" | "simple";

function resolveRequestType(
  hasPhoto: boolean,
  turnCount: number
): RequestType {
  if (hasPhoto) return "photo";
  if (turnCount >= 4) return "complex";
  return "simple";
}

/* ── Initial session state ── */
function createInitialSessionState(): SessionState {
  return {
    equipment: { brand: "", model: "", type: "", serial_number: "" },
    readings: {
      suction_pressure: "",
      discharge_pressure: "",
      superheat: "",
      subcooling: "",
      ambient_temp: "",
      supply_temp: "",
      return_temp: "",
    },
    symptoms: [],
    ruled_out: [],
    working_diagnosis: "",
    photos_received: [],
  };
}

export interface UseChatReturn {
  messages: ChatMessage[];
  sessionState: SessionState;
  isLoading: boolean;
  safetyGateOpen: boolean;
  pendingSafetyContent: string | null;
  sendMessage: (content: string, imageUrl?: string) => Promise<void>;
  confirmSafety: () => void;
  newDiagnostic: () => void;
}

export function useChat(user: User | null): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>(
    createInitialSessionState()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [safetyGateOpen, setSafetyGateOpen] = useState(false);
  const [pendingSafetyContent, setPendingSafetyContent] = useState<
    string | null
  >(null);

  const turnCountRef = useRef(0);
  const currentSessionIdRef = useRef<string | null>(null);

  const sendMessage = useCallback(
    async (content: string, imageUrl?: string) => {
      /* Create a diagnostic session on first message if user is logged in */
      if (!currentSessionIdRef.current && user?.id) {
        try {
          const { data, error } = await createDiagnosticSession(user.id);
          if (!error && data?.id) {
            currentSessionIdRef.current = data.id;
          }
        } catch (e) {
          console.error("Failed to create diagnostic session:", e);
        }
      }

      /* Build user message */
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        image_url: imageUrl,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      turnCountRef.current += 1;

      const hasPhoto = !!imageUrl;
      const requestType = resolveRequestType(hasPhoto, turnCountRef.current);

      /* Convert image to base64 if present */
      let imageBase64: string | undefined;
      let imageMediaType: string | undefined;
      if (imageUrl) {
        const result = await blobUrlToBase64(imageUrl);
        if (result) {
          imageBase64 = result.base64;
          imageMediaType = result.mediaType;
        }
      }

      /* Prepare last 4 messages for context window */
      const recentMessages = [...messages, userMsg]
        .slice(-40)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      /* Attach base64 image to the last user message if present */
      if (imageBase64) {
        const lastMsg = recentMessages[recentMessages.length - 1];
        (lastMsg as Record<string, unknown>).image_base64 = imageBase64;
        (lastMsg as Record<string, unknown>).image_media_type = imageMediaType;
      }

      try {
        /* Get user info from user object, fall back to defaults */
        const firstName = user?.first_name || "Tech";
        const experienceLevel = user?.experience_level || "mid";

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: recentMessages,
            sessionState,
            hasPhoto,
            turnCount: turnCountRef.current,
            requestType,
            firstName,
            experienceLevel,
            userId: user?.id,
          }),
        });

        if (!res.ok) {
          throw new Error(`Chat API error: ${res.status}`);
        }

        /* Stream the response */
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (reader) {
          let done = false;
          while (!done) {
            const { value, done: streamDone } = await reader.read();
            done = streamDone;
            if (value) {
              const chunk = decoder.decode(value, { stream: true });
              assistantContent += chunk;

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          }
        }

        /* Extract equipment tag and strip from displayed content */
        const equipmentMatch = assistantContent.match(
          /<!-- EQUIPMENT:brand=(.+?)\|model=(.+?) -->/
        );
        if (equipmentMatch) {
          const extractedBrand = equipmentMatch[1].trim();
          const extractedModel = equipmentMatch[2].trim();

          /* Strip the tag from displayed message */
          const cleanContent = assistantContent
            .replace(/<!-- EQUIPMENT:brand=.+?\|model=.+? -->/, "")
            .trimEnd();
          assistantContent = cleanContent;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: cleanContent } : m
            )
          );

          /* Update session state with equipment info */
          setSessionState((prev) => ({
            ...prev,
            equipment: {
              ...prev.equipment,
              brand: extractedBrand,
              model: extractedModel,
            },
          }));

          /* Auto-populate manuals via shared store */
          const gq = encodeURIComponent(`${extractedBrand} ${extractedModel}`);
          const manualUrls = [
            { type: "INSTALL", url: `https://www.google.com/search?q=${gq}+installation+manual+filetype:pdf` },
            { type: "SERVICE", url: `https://www.google.com/search?q=${gq}+service+manual+filetype:pdf` },
            { type: "WIRING", url: `https://www.google.com/search?q=${gq}+wiring+diagram+filetype:pdf` },
            { type: "PARTS", url: `https://www.google.com/search?q=${gq}+parts+catalog+filetype:pdf` },
          ];

          addManual({
            id: crypto.randomUUID(),
            user_id: user?.id || "",
            model_number: extractedModel,
            brand: extractedBrand,
            search_date: new Date().toISOString(),
            manual_urls: manualUrls,
          });

          /* Persist manual search to DB (fire-and-forget) */
          if (user?.id) {
            createManualSearch(user.id, extractedModel, extractedBrand, manualUrls)
              .then(() => {})
              .catch((e) => console.error("Failed to persist manual search:", e));
          }
        }

        /* Check for safety triggers */
        const triggerPhrase = containsSafetyTrigger(assistantContent);
        if (triggerPhrase) {
          setPendingSafetyContent(assistantContent);
          setSafetyGateOpen(true);

          /* Log safety trigger to DB (fire-and-forget) */
          if (user?.id && currentSessionIdRef.current) {
            logSafetyAcknowledgment(user.id, currentSessionIdRef.current, triggerPhrase)
              .then(() => {})
              .catch((e) => console.error("Failed to log safety acknowledgment:", e));
          }
        }

        /* Update session state from symptoms */
        if (turnCountRef.current === 1 && content) {
          setSessionState((prev) => ({
            ...prev,
            symptoms: [...prev.symptoms, content],
          }));
        }

        if (imageUrl) {
          setSessionState((prev) => ({
            ...prev,
            photos_received: [...prev.photos_received, imageUrl],
          }));
        }

        /* Persist conversation to DB after AI response (fire-and-forget) */
        if (currentSessionIdRef.current) {
          // We need the final messages array — build it from what we know
          const updatedMessages = [...messages, userMsg, { ...assistantMsg, content: assistantContent }];
          updateDiagnosticSession(currentSessionIdRef.current, {
            full_conversation: updatedMessages,
            session_state: sessionState,
            opening_message: updatedMessages.find((m) => m.role === "user")?.content || "",
            equipment_brand: sessionState.equipment.brand || undefined,
            equipment_model: sessionState.equipment.model || undefined,
            serial_number: sessionState.equipment.serial_number || undefined,
          })
            .then(() => {})
            .catch((e) => console.error("Failed to update diagnostic session:", e));
        }
      } catch (error) {
        console.error("Chat error:", error);
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "CONNECTION LOST. Check signal and retry. If the issue persists, describe your situation again.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, sessionState, user]
  );

  const confirmSafety = useCallback(() => {
    setSafetyGateOpen(false);
    setPendingSafetyContent(null);
  }, []);

  const newDiagnostic = useCallback(() => {
    /* End current session in DB before resetting (fire-and-forget) */
    if (currentSessionIdRef.current) {
      endDiagnosticSession(currentSessionIdRef.current, "unresolved")
        .then(() => {})
        .catch((e) => console.error("Failed to end diagnostic session:", e));
      currentSessionIdRef.current = null;
    }

    setMessages([]);
    setSessionState(createInitialSessionState());
    turnCountRef.current = 0;
    setIsLoading(false);
    setSafetyGateOpen(false);
    setPendingSafetyContent(null);
  }, []);

  return {
    messages,
    sessionState,
    isLoading,
    safetyGateOpen,
    pendingSafetyContent,
    sendMessage,
    confirmSafety,
    newDiagnostic,
  };
}
