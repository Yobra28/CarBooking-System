/* eslint-disable prettier/prettier */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}
