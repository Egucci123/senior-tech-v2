"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ChatMessage, SessionState, User } from "@/types";
import { addManual } from "./useManuals";
import { buildManualUrls } from "@/lib/manual-links";
import { getBaseModel } from "@/lib/model-utils";
import {
  createDiagnosticSession,
  updateDiagnosticSession,
  endDiagnosticSession,
  createManualSearch,
  logSafetyAcknowledgment,
} from "@/lib/supabase";

/* ── Convert a blob URL to base64, resizing to max 1920px ── */
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
        const MAX = 1920;
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
  currentSessionId: string | null;
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
  const abortControllerRef = useRef<AbortController | null>(null);

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => { abortControllerRef.current?.abort(); };
  }, []);

  /* ── Late user init: create session when user becomes available ── */
  useEffect(() => {
    if (user?.id && messages.length > 0 && !currentSessionIdRef.current) {
      createDiagnosticSession(user.id)
        .then(({ data }) => {
          if (data?.id) currentSessionIdRef.current = data.id;
        })
        .catch((e) => console.error("[useChat] Late session create:", e));
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── sessionState localStorage persistence ── */
  useEffect(() => {
    if (!currentSessionIdRef.current || messages.length === 0) return;
    try {
      localStorage.setItem(
        `st_session_${currentSessionIdRef.current}`,
        JSON.stringify(sessionState)
      );
    } catch {
      // quota exceeded — ignore
    }
  }, [sessionState]); // eslint-disable-line react-hooks/exhaustive-deps

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

      /* Prepare last 40 messages for context window */
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

        /* Abort any in-flight request before starting a new one */
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortControllerRef.current.signal,
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
          if (res.status === 429) {
            const errData = await res.json().catch(() => ({}));
            const errorMsg: ChatMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: errData.message || "You've reached today's message limit — resets at midnight.",
              timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMsg]);
            return;
          }
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
          try {
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
          } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            console.error("[useChat] Stream error:", err);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: (m.content || "").trim() + "\n\n_[Response interrupted — please try again.]_" }
                  : m
              )
            );
          }
        }

        /* Extract no-manual reason for pre-2005 equipment — strip tag, append note to chat */
        const noManualMatch = assistantContent.match(/<!-- NO_MANUAL_REASON:(.+?) -->/);
        if (noManualMatch) {
          const note = `\n\n_${noManualMatch[1]}_`;
          assistantContent = assistantContent
            .replace(/<!-- NO_MANUAL_REASON:.+? -->/, "")
            .trimStart() + note;
          setMessages((prev) =>
            prev.map((m) => m.id === assistantMsg.id ? { ...m, content: assistantContent } : m)
          );
        }

        /* Extract Brave manual URLs and strip tag from displayed content */
        const braveManualMatch = assistantContent.match(
          /<!-- BRAVE_MANUALS:([\s\S]+?) -->/
        );
        if (braveManualMatch) {
          try {
            const braveManuals: { type: string; url: string; title: string }[] =
              JSON.parse(braveManualMatch[1]);
            const cleanContent = assistantContent
              .replace(/<!-- BRAVE_MANUALS:[\s\S]+? -->/, "")
              .trimStart();
            assistantContent = cleanContent;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id ? { ...m, content: cleanContent } : m
              )
            );

            /* Push real Brave-found manuals to Manuals tab */
            const manualUrls = braveManuals.map((m) => ({ type: m.type, url: m.url }));
            const brandFromState = sessionState?.equipment?.brand || "";
            const modelFromState = sessionState?.equipment?.model || "";
            addManual({
              id: crypto.randomUUID(),
              user_id: user?.id || "",
              model_number: modelFromState,
              brand: brandFromState,
              search_date: new Date().toISOString(),
              manual_urls: manualUrls,
            });
            if (user?.id) {
              createManualSearch(user.id, modelFromState, brandFromState, manualUrls)
                .then(() => {})
                .catch((e) => console.error("Failed to persist brave manuals:", e));
            }
          } catch (e) {
            console.warn("[useChat] BRAVE_MANUALS tag parse failed:", e);
          }
        }

        /* Extract equipment tag and strip from displayed content */
        const equipmentMatch = assistantContent.match(
          /<!-- EQUIPMENT:brand=(.+?)\|model=(.+?) -->/
        );

        if (!equipmentMatch && assistantContent.length > 300) {
          console.debug("[useChat] No EQUIPMENT tag in response (length:", assistantContent.length, ")");
        }

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

          /* Auto-populate manuals — only if Brave didn't add one and it's not pre-2005 */
          if (!braveManualMatch && !noManualMatch) {
            const manualUrls = buildManualUrls(extractedBrand, getBaseModel(extractedModel));

            addManual({
              id: crypto.randomUUID(),
              user_id: user?.id || "",
              model_number: extractedModel,
              brand: extractedBrand,
              search_date: new Date().toISOString(),
              manual_urls: manualUrls,
            });

            if (user?.id) {
              createManualSearch(user.id, extractedModel, extractedBrand, manualUrls)
                .then(() => {})
                .catch((e) => console.error("Failed to persist manual search:", e));
            }
          }
        }

        /* Safety trigger logging only — no UI gate */
        const triggerPhrase = containsSafetyTrigger(assistantContent);
        if (triggerPhrase && user?.id && currentSessionIdRef.current) {
          logSafetyAcknowledgment(user.id, currentSessionIdRef.current, triggerPhrase)
            .then(() => {})
            .catch((e) => console.error("Failed to log safety acknowledgment:", e));
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
        if (currentSessionIdRef.current && user?.id) {
          // We need the final messages array — build it from what we know
          const updatedMessages = [...messages, userMsg, { ...assistantMsg, content: assistantContent }];
          updateDiagnosticSession(currentSessionIdRef.current, {
            full_conversation: updatedMessages,
            session_state: sessionState,
            opening_message: updatedMessages.find((m) => m.role === "user")?.content || "",
            equipment_brand: sessionState.equipment.brand || undefined,
            equipment_model: sessionState.equipment.model || undefined,
            serial_number: sessionState.equipment.serial_number || undefined,
          }, user.id)
            .then(() => {})
            .catch((e) => console.error("Failed to update diagnostic session:", e));
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
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

    /* Revoke any blob URLs before resetting state */
    setSessionState((prev) => {
      if (prev.photos_received) {
        prev.photos_received.forEach((url: string) => {
          if (url.startsWith("blob:")) URL.revokeObjectURL(url);
        });
      }
      return createInitialSessionState();
    });

    setMessages([]);
    turnCountRef.current = 0;
    setIsLoading(false);
    setSafetyGateOpen(false);
    setPendingSafetyContent(null);
  }, []);

  return {
    messages,
    sessionState,
    currentSessionId: currentSessionIdRef.current,
    isLoading,
    safetyGateOpen,
    pendingSafetyContent,
    sendMessage,
    confirmSafety,
    newDiagnostic,
  };
}
