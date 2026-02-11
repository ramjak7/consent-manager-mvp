export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
