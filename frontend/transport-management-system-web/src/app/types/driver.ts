import { IEmployee } from "./employee";
import { IGeographicalEntity } from "./general-settings";

export interface IDriver extends IEmployee {
  employeeCategory: "DRIVER";
  permisNumber?: string;
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
  geographicalEntityIds?: number[];
  geographicalEntities?: IGeographicalEntity[];
}