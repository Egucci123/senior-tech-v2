"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessage, SessionState } from "@/types";
import { addManual } from "./useManuals";

/* ── Convert a blob URL to base64 ── */
async function blobUrlToBase64(blobUrl: string): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const [header, data] = dataUrl.split(",");
        const mediaType = header.match(/:(.*?);/)?.[1] || "image/jpeg";
        resolve({ base64: data, mediaType });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
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

function containsSafetyTrigger(text: string): boolean {
  const lower = text.toLowerCase();
  return SAFETY_TRIGGERS.some((phrase) => lower.includes(phrase));
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

export function useChat(): UseChatReturn {
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

  const sendMessage = useCallback(
    async (content: string, imageUrl?: string) => {
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
        .slice(-4)
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
        /* Get user info from localStorage */
        const firstName = localStorage.getItem("senior_tech_first_name") || "Tech";
        const experienceLevel = localStorage.getItem("senior_tech_experience_level") || "mid";

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
          const q = encodeURIComponent(`${extractedModel}`);
          addManual({
            id: crypto.randomUUID(),
            user_id: "",
            model_number: extractedModel,
            brand: extractedBrand,
            search_date: new Date().toISOString(),
            manual_urls: [
              { type: "INSTALL", url: `https://www.manualslib.com/search/?q=${q}+installation+manual` },
              { type: "SERVICE", url: `https://www.manualslib.com/search/?q=${q}+service+manual` },
              { type: "WIRING", url: `https://www.manualslib.com/search/?q=${q}+wiring+diagram` },
              { type: "PARTS", url: `https://www.manualslib.com/search/?q=${q}+parts+list` },
            ],
          });
        }

        /* Check for safety triggers */
        if (containsSafetyTrigger(assistantContent)) {
          setPendingSafetyContent(assistantContent);
          setSafetyGateOpen(true);
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
      } catch (error) {
        console.error("Chat error:", error);
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "CONNECTION LOST. Check signal and retry. If the issue persists, describe your situation again.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, sessionState]
  );

  const confirmSafety = useCallback(() => {
    setSafetyGateOpen(false);
    setPendingSafetyContent(null);
  }, []);

  const newDiagnostic = useCallback(() => {
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
