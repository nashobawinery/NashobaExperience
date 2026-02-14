export interface ReactivationCustomer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  lastVisitDate: string;
  totalVisits: number;
  totalSpend: number;
}

export interface ReactivationSegment {
  name: string;
  description: string;
  criteria: {
    inactiveDays: number;
    minVisits?: number;
    minSpend?: number;
  };
}
