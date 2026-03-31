/**
 * Session state management — maintained per conversation.
 * Only the state object + last 4 messages are sent on each API call.
 */

export interface EquipmentState {
  brand: string;
  model: string;
  serial: string;
  age_years: number | null;
  refrigerant: string;
  charge_oz: number | null;
  voltage: string;
  phase: string;
  tonnage: number | null;
  seer: number | null;
  min_circuit_amps: number | null;
  max_overcurrent: number | null;
  compressor_model: string;
  ahri_number: string;
}

export interface ReadingsState {
  suction_psig: number | null;
  discharge_psig: number | null;
  sh_f: number | null;
  sc_f: number | null;
  suction_sat_temp: number | null;
  discharge_sat_temp: number | null;
  liquid_temp: number | null;
  ambient_temp: number | null;
}

export interface SessionState {
  equipment: EquipmentState;
  readings: ReadingsState;
  symptoms: string[];
  ruled_out: string[];
  working_diagnosis: string;
  photos_received: string[];
}

export function createInitialSessionState(): SessionState {
  return {
    equipment: {
      brand: '',
      model: '',
      serial: '',
      age_years: null,
      refrigerant: '',
      charge_oz: null,
      voltage: '',
      phase: '',
      tonnage: null,
      seer: null,
      min_circuit_amps: null,
      max_overcurrent: null,
      compressor_model: '',
      ahri_number: '',
    },
    readings: {
      suction_psig: null,
      discharge_psig: null,
      sh_f: null,
      sc_f: null,
      suction_sat_temp: null,
      discharge_sat_temp: null,
      liquid_temp: null,
      ambient_temp: null,
    },
    symptoms: [],
    ruled_out: [],
    working_diagnosis: '',
    photos_received: [],
  };
}

/**
 * Model routing logic
 */
export type RequestType = 'photo_analysis' | 'complex_diagnostic' | 'simple_turn' | 'job_summary' | 'checklist';

export function getModelForRequest(
  hasPhoto: boolean,
  turnCount: number,
  requestType?: RequestType
): { model: string; maxTokens: number } {
  if (requestType === 'job_summary') {
    return { model: 'claude-haiku-4-5-20251001', maxTokens: 200 };
  }
  if (requestType === 'checklist') {
    return { model: 'claude-haiku-4-5-20251001', maxTokens: 150 };
  }
  if (hasPhoto) {
    return { model: 'claude-sonnet-4-20250514', maxTokens: 1000 };
  }
  if (turnCount >= 4) {
    return { model: 'claude-sonnet-4-20250514', maxTokens: 800 };
  }
  return { model: 'claude-haiku-4-5-20251001', maxTokens: 300 };
}

/**
 * Safety gate trigger detection
 */
const SAFETY_TRIGGERS = [
  'live voltage',
  'energized',
  'power on',
  'with power',
  'measure voltage at',
  'check voltage at',
  'meter on',
];

export function detectSafetyTrigger(text: string): string | null {
  const lower = text.toLowerCase();
  for (const trigger of SAFETY_TRIGGERS) {
    if (lower.includes(trigger)) {
      return trigger;
    }
  }
  return null;
}

/**
 * Daily message cap check
 */
export const DAILY_MESSAGE_CAP = 75;
export const DAILY_WARNING_THRESHOLD = 70;
