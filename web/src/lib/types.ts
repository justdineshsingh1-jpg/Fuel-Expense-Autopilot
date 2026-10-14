export type Role = 'field_agent' | 'team_leader' | 'manager' | 'managing_director' | 'accounts';

export type User = {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
  role: Role;
  department: string;
  reportingTo?: string;
};

export type ApprovalStatus = 
  | 'draft' 
  | 'active'
  | 'pending' 
  | 'submitted'
  | 'auto_validated'
  | 'supervisor_approved' 
  | 'manager_approved' 
  | 'md_approved' 
  | 'finance_settled' 
  | 'approved' 
  | 'rejected' 
  | 'returned' 
  | 'flagged' 
  | 'abandoned';

export type ValidationStatus = 'clean' | 'exception' | 'incomplete';

export type TripLog = {
  id: string;
  userId: string;
  employeeName: string;
  employeeCode?: string;
  department?: string;
  vehicleNumber?: string;
  project?: string;
  date: string; // ISO format
  logDate?: string;
  route: string;
  startReading: number;
  endReading: number;
  distanceKm: number;
  claimedKm: number;
  osrmKm: number;
  variancePercentage: number;
  fuelAmount: number;
  miscAmount?: number;
  totalAmount?: number;
  status: ApprovalStatus;
  validationStatus?: ValidationStatus;
  startOdometerPhotoUrl?: string;
  endOdometerPhotoUrl?: string;
  fuelBillPhotoUrl?: string;
  miscBillPhotoUrl?: string;
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

export type FlagSeverity = 'low' | 'medium' | 'high' | 'critical';

export type FraudFlag = {
  id: string;
  type: string;
  description: string;
  severity: FlagSeverity;
  resolved: boolean;
  executiveExplanation?: string;
  tripDate: string;
  employeeName: string;
  tripId?: string;
};

export type ApprovalAudit = {
  id: string;
  action: 'submitted' | 'auto_validated' | 'supervisor_approved' | 'manager_approved' | 'md_approved' | 'finance_settled' | 'approved' | 'rejected' | 'flagged' | 'returned' | 'escalated';
  actorName: string;
  actorRole: Role | 'system';
  timestamp: string;
  comments?: string;
  amount?: number;
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

