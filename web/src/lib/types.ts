export type Role = 'team_leader' | 'manager' | 'managing_director' | 'accounts';

export type User = {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
  role: Role;
  department: string;
  reportingTo?: string;
};

export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'flagged';

export type TripLog = {
  id: string;
  userId: string;
  employeeName: string;
  date: string; // ISO format
  route: string;
  distanceKm: number;
  claimedKm: number;
  osrmKm: number;
  variancePercentage: number;
  fuelAmount: number;
  status: ApprovalStatus;
  startOdometerPhotoUrl?: string;
  endOdometerPhotoUrl?: string;
  fuelBillPhotoUrl?: string;
  clientVisits: ClientVisit[];
  fraudFlags: FraudFlag[];
  waypoints: string[];
  approvalHistory: ApprovalAudit[];
};

export type ClientVisit = {
  id: string;
  clientName: string;
  timestamp: string;
  location: string;
};

export type FlagSeverity = 'low' | 'medium' | 'high';

export type FraudFlag = {
  id: string;
  type: string;
  description: string;
  severity: FlagSeverity;
  resolved: boolean;
  executiveExplanation?: string;
  tripDate: string;
  employeeName: string;
};

export type ApprovalAudit = {
  id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'flagged' | 'returned';
  actorName: string;
  actorRole: Role;
  timestamp: string;
  comments?: string;
};

export type AccountExportRecord = {
  id: string;
  voucherDate: string;
  ledgerName: string;
  employeeCode: string;
  employeeName: string;
  distanceKm: number;
  fuelAmount: number;
  debitAmount: number;
  creditAmount: number;
};
