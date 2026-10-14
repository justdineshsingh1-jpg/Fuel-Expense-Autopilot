export const ROLE_LABELS: Record<string, string> = {
  field_agent: 'Field Executive',
  team_leader: 'Supervisor (Team Leader)',
  manager: 'Manager',
  managing_director: 'Managing Director (MD)',
  accounts: 'Finance / Accounts',
};

export const STATUS_LABELS: Record<string, string> = {
  active: 'Active Shift',
  draft: 'Draft',
  pending: 'Pending Review',
  submitted: 'Submitted',
  auto_validated: 'Auto-Validated (Clean)',
  supervisor_approved: 'Supervisor Approved',
  manager_approved: 'Manager Approved',
  md_approved: 'MD Approved',
  finance_settled: 'Finance Settled',
  approved: 'Approved',
  rejected: 'Rejected',
  returned: 'Returned for Correction',
  flagged: 'Audit Flagged',
  abandoned: 'Abandoned Shift',
};

export const FLAG_TYPE_LABELS: Record<string, string> = {
  distance_mismatch: 'Distance Mismatch',
  time_anomaly: 'Time Anomaly',
  duplicate_bill: 'Duplicate Bill',
  weekend_travel: 'Weekend Travel',
  high_variance: 'High Route Variance',
  HIGH_ROUTE_VARIANCE: 'High Route Variance',
  OCR_AMOUNT_MISMATCH: 'Fuel Slip OCR Discrepancy',
  MISSING_RECEIPT: 'Missing Required Receipt',
  EXCESSIVE_DISTANCE: 'High Daily Distance (>350 KM)',
  LIMIT_EXCEEDED: 'Threshold Limit Exceeded',
};

// Financial delegation limits for approvals
export const DELEGATION_LIMITS = {
  supervisor: 1000, // Up to ₹1,000 approved at supervisor level
  manager: 2500,    // Up to ₹2,500 approved at manager level
  md: Infinity,     // Unlimited (High value & policy overrides)
};

// Validation Engine Config
export const VALIDATION_RULES = {
  MAX_ROUTE_VARIANCE_PERCENT: 18,
  CRITICAL_ROUTE_VARIANCE_PERCENT: 30,
  MAX_DAILY_KM: 350,
  MAX_OCR_MISMATCH_INR: 5,
  STANDARD_CONVEYANCE_RATE_PER_KM: 3.5, // Standard rate for 2-wheeler
};
