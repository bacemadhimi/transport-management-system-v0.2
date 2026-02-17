export interface IFuel {
  id: number;
  truckId: number;
  driverId: number;
  fillDate: string;
  quantity: number;
  odometerReading: string;
  amount: number;
  comment: string;
  fuelTank: string;
  fuelVendorId: number;
  
 
  truck?: {
    id: number;
    immatriculation: string;
    brand: string;
  };
  
  driver?: {
    id: number;
    name: string;
    permisNumber: string;
  };
  
  fuelVendor?: {
    id: number;
    name: string;
  };
}