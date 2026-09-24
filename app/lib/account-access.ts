import {
  createAccountAccessSnapshot,
  createAccountAccessView,
  DEFAULT_BILLING_STATE,
  type AccountAccessView,
  type BillingState,
  type SpeakFlowMonthlyUsage,
} from "./entitlements";

const EMPTY_USAGE: SpeakFlowMonthlyUsage = {
  coachInteractions: 0,
  voiceCharacters: 0,
};

export function createSafeFreeAccessView(): AccountAccessView {
  return createAccountAccessView(
    createAccountAccessSnapshot(DEFAULT_BILLING_STATE, EMPTY_USAGE)
  );
}

export function createVerifiedAccessView(
  billing: BillingState,
  usage: SpeakFlowMonthlyUsage
): AccountAccessView {
  return createAccountAccessView(
    createAccountAccessSnapshot(billing, usage)
  );
}

// Future Supabase billing data must be validated server-side before it reaches
// createVerifiedAccessView. Missing or unverified billing data stays Free.
