import { IEmployee } from "./employee";

export interface IDriver extends IEmployee {
  employeeCategory: "DRIVER";


  status?: string;
  idCamion?: number;
  zoneId?: number;
  zoneName?: string;
  cityId?: number;
  imageBase64?: string | null;


  availabilityStatus?: 'available' | 'overtime' | 'exceeded' | 'conflict';
  availabilityMessage?: string;
  requiresApproval?: boolean;
  totalHours?: number;





}