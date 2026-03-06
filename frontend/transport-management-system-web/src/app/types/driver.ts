import { IEmployee } from "./employee";

export interface IDriver extends IEmployee {
  employeeCategory: "DRIVER";


  status?: string;
  idCamion?: number;
  zoneId?: number;
  zoneName?: string;
  cityId?: number;
  imageBase64?: string | null;

  driverGeographicalEntities?: Array<{
      id?: number;
      driverId?: number;
      geographicalEntityId: number;
      geographicalEntity?: any;
    }>;
  availabilityStatus?: 'available' | 'overtime' | 'exceeded' | 'conflict';
  availabilityMessage?: string;
  requiresApproval?: boolean;
  totalHours?: number;





}