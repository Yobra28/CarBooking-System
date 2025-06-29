/* eslint-disable prettier/prettier */
export interface ApiResponse<T> {
  sucess: boolean;
  message: string;
  data?: T;
  error?: string;
}