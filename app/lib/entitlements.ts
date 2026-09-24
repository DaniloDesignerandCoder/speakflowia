export type SpeakFlowPlan = "free" | "pro";

export type SpeakFlowEntitlements = {
  plan: SpeakFlowPlan;
  coachMonthlyLimit: number;
  voiceCharacterMonthlyLimit: number;
  fullLabs: boolean;
  fullAdaptiveLearning: boolean;
  fullHistory: boolean;
};

export type SpeakFlowMonthlyUsage = {
  coachInteractions: number;
  voiceCharacters: number;
};

export type SpeakFlowAccessState = {
  entitlements: SpeakFlowEntitlements;
  usage: SpeakFlowMonthlyUsage;
};

export const SPEAKFLOW_PLAN_LIMITS: Record<SpeakFlowPlan, SpeakFlowEntitlements> = {
  free: {
    plan: "free",
    coachMonthlyLimit: 50,
    voiceCharacterMonthlyLimit: 5_000,
    fullLabs: false,
    fullAdaptiveLearning: false,
    fullHistory: false,
  },
  pro: {
    plan: "pro",
    coachMonthlyLimit: 1_000,
    voiceCharacterMonthlyLimit: 50_000,
    fullLabs: true,
    fullAdaptiveLearning: true,
    fullHistory: true,
  },
};

export function getUsageRemaining(used: number, limit: number) {
  return Math.max(0, limit - Math.max(0, used));
}

export function hasUsageAvailable(used: number, limit: number) {
  return getUsageRemaining(used, limit) > 0;
}

// This module describes product capabilities only.
// The server-side billing/entitlement layer will remain authoritative for Pro access.
