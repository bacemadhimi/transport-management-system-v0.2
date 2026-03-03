import { IEmployee } from "./employee";

export interface IDriver extends IEmployee {
  employeeCategory: "DRIVER"; // Fixed category
  
  // Driver-specific properties
  status?: string;
  idCamion?: number; // Currently assigned truck
  zoneId?: number;
  zoneName?: string;
  cityId?: number;
  imageBase64?: string | null;
  
  // Availability fields (for UI)
  availabilityStatus?: 'available' | 'overtime' | 'exceeded' | 'conflict';
  availabilityMessage?: string;
  requiresApproval?: boolean;
  totalHours?: number;
  
  // Legacy fields (already in IEmployee)
  // permisNumber: string; (maps to drivingLicense)
  // phone: string; (maps to phoneNumber)
  // phoneCountry: string;
}