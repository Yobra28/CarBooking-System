export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  userId: string;
  vehicleId: string;
  createdAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  vehicle?: {
    id: string;
    name: string;
    make: string;
    model: string;
  };
} 