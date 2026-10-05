export const ROLE_LABELS: Record<string, string> = {
  team_leader: 'Team Leader',
  manager: 'Manager',
  managing_director: 'Managing Director',
  accounts: 'Accounts',
};

export const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  flagged: 'Flagged',
};

export const FLAG_TYPE_LABELS: Record<string, string> = {
  distance_mismatch: 'Distance Mismatch',
  time_anomaly: 'Time Anomaly',
  duplicate_bill: 'Duplicate Bill',
  weekend_travel: 'Weekend Travel',
  high_variance: 'High OSRM Variance',
};
