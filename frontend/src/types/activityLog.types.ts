export interface AuditLog {
  auditId: string;
  eventType: string;
  consentId: string;
  userId: string;
  timestamp: string;  
  details: any;
  prevHash: string | null;
  hash: string;
}

export interface ActivityLogListResponse {
  success: boolean;
  data: AuditLog[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
