export class ApiResponseDto<T> {
  status: number;
  message: string;
  data: T | null;

  constructor(status: number, message: string, data: T | null = null) {
    this.status = status;
    this.message = message;
    this.data = data;
  }
}

export class PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
