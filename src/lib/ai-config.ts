/**
 * Centralized AI model and token configuration.
 * Update here when models change — don't hunt across files.
 */
export const AI_MODELS = {
  SONNET: "claude-sonnet-4-5",
  HAIKU: "claude-haiku-4-5",
} as const;

export const MAX_TOKENS = {
  photo: 1500,
  complex: 800,
  simple: 300,
  summary: 600,
} as const;

export const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";
