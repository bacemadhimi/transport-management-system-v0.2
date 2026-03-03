import { IEmployee } from "./employee";

export interface IConvoyeur extends IEmployee {
  employeeCategory: "CONVOYEUR"; // Fixed category
  
  // Convoyeur-specific properties
  matricule?: string;
  status?: string;
  zoneId?: number;
  cityId?: number;
  
  // Legacy fields (already in IEmployee)
  // permisNumber: string; (maps to drivingLicense)
  // phone: string; (maps to phoneNumber)
  // phoneCountry: string;
}
