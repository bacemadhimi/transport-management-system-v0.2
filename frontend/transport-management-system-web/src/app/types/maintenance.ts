// types/maintenance.ts
export interface IMaintenance {
  id: number;
  tripId: number;
  vendorId: number;
  mechanicId: number;
  status: string;
  startDate: string;
  endDate: string;
  odometerReading: number;
  totalCost: number;
  serviceDetails: string;
  partsName: string;
  quantity: number;
  notificationType: 'Email' | 'SMS' | 'Both';
  members: string;
  
  // Related entities
  trip?: {
    id: number;
    destination: string;
    reference: string;
    truckId: number;
    bookingId: string;
  };
  
  vendor?: {
    id: number;
    name: string;
  };
  
  mechanic?: {
    id: number;
    name: string;
    specialization: string;
  };
  
  
  truck?: {
    id: number;
    immatriculation: string;
    brand: string;
  };
}