export type SpeakFlowPlan = "free" | "pro";
export type SubscriptionStatus = "none" | "pending" | "active" | "past_due" | "canceled" | "expired";

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

export type BillingState = {
  plan: SpeakFlowPlan;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: string | null;
};

export type AccountAccessSnapshot = {
  billing: BillingState;
  entitlements: SpeakFlowEntitlements;
  usage: SpeakFlowMonthlyUsage;
};

export type UsageLevel = "available" | "near_limit" | "limit_reached";
export type UsageResource = "coach" | "voice";
export type UsageAction = "allow" | "warn" | "block";
export type AccessReason = "available" | "near_limit" | "limit_reached" | "pro_required";

export type AccessDecision = {
  allowed: boolean;
  action: UsageAction;
  reason: AccessReason;
};

export type UsageStatus = {
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  level: UsageLevel;
};

export const DEFAULT_BILLING_STATE: BillingState = {
  plan: "free",
  subscriptionStatus: "none",
  currentPeriodEnd: null,
};

export function resolveEffectivePlan(billing: BillingState): SpeakFlowPlan {
  if (billing.plan === "pro" && billing.subscriptionStatus === "active") return "pro";
  return "free";
}

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

export function createAccountAccessSnapshot(
  billing: BillingState,
  usage: SpeakFlowMonthlyUsage
): AccountAccessSnapshot {
  const effectivePlan = resolveEffectivePlan(billing);
  return {
    billing,
    entitlements: SPEAKFLOW_PLAN_LIMITS[effectivePlan],
    usage: {
      coachInteractions: Math.max(0, usage.coachInteractions),
      voiceCharacters: Math.max(0, usage.voiceCharacters),
    },
  };
}

export function getUsageRemaining(used: number, limit: number) {
  return Math.max(0, limit - Math.max(0, used));
}

export function hasUsageAvailable(used: number, limit: number) {
  return getUsageRemaining(used, limit) > 0;
}

export function getUsageStatus(used: number, limit: number): UsageStatus {
  const safeLimit = Math.max(0, limit);
  const safeUsed = Math.max(0, used);
  const remaining = getUsageRemaining(safeUsed, safeLimit);
  const percentUsed = safeLimit === 0 ? 100 : Math.min(100, Math.round((safeUsed / safeLimit) * 100));

  let level: UsageLevel = "available";
  if (remaining === 0) level = "limit_reached";
  else if (percentUsed >= 80) level = "near_limit";

  return { used: safeUsed, limit: safeLimit, remaining, percentUsed, level };
}

export function getUsageAction(status: UsageStatus): UsageAction {
  if (status.level === "limit_reached") return "block";
  if (status.level === "near_limit") return "warn";
  return "allow";
}

export function getUsageDecision(status: UsageStatus): AccessDecision {
  const action = getUsageAction(status);
  return {
    allowed: action !== "block",
    action,
    reason: status.level,
  };
}

export function getFeatureDecision(plan: SpeakFlowPlan, requiresPro: boolean): AccessDecision {
  if (requiresPro && plan !== "pro") {
    return { allowed: false, action: "block", reason: "pro_required" };
  }
  return { allowed: true, action: "allow", reason: "available" };
}

export function getUsageMessage(resource: UsageResource, status: UsageStatus) {
  if (status.level === "available") return null;

  const label = resource === "coach" ? "interações com o Coach" : "caracteres de voz neural";

  if (status.level === "near_limit") {
    return `Você ainda tem ${status.remaining.toLocaleString("pt-BR")} ${label} neste ciclo.`;
  }

  return `Seu limite mensal de ${label} foi atingido.`;
}

export function getAccessUsageStatus(state: SpeakFlowAccessState) {
  return {
    coach: getUsageStatus(state.usage.coachInteractions, state.entitlements.coachMonthlyLimit),
    voice: getUsageStatus(state.usage.voiceCharacters, state.entitlements.voiceCharacterMonthlyLimit),
  };
}

// This module describes product capabilities only.
// The server-side billing/entitlement layer will remain authoritative for Pro access.
