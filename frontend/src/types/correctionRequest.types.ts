export interface CorrectionRequest {
  requestId: string;
  userId: string;
  fieldName: string;
  currentValue?: string;
  correctedValue: string;
  reason: CorrectionReason;
  additionalNotes?: string;
  status: CorrectionRequestStatus;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  reviewNotes?: string;
  completedAt?: string;
}

export type CorrectionRequestStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

export type CorrectionReason =
  | 'INACCURATE'
  | 'INCOMPLETE'
  | 'OUTDATED'
  | 'MISLEADING';

export interface CreateCorrectionRequestPayload {
  fieldName: string;
  currentValue?: string;
  correctedValue: string;
  reason: CorrectionReason;
  additionalNotes?: string;
}
