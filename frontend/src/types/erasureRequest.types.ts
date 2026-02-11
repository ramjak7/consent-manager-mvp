export interface ErasureRequest {
  requestId: string;
  userId: string;
  reason: string;
  additionalNotes?: string;
  status: ErasureRequestStatus;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  reviewNotes?: string;
  completedAt?: string;
}

export type ErasureRequestStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";

export interface CreateErasureRequestInput {
  reason: string;
  additionalNotes?: string;
}

export interface ErasureRequestListResponse {
  success: boolean;
  data: ErasureRequest[];
}

export interface ErasureRequestResponse {
  success: boolean;
  data: ErasureRequest;
}
