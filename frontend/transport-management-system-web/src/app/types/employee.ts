import { ITruckType } from './truck-type';

export interface IEmployee {
  id: number;
  idNumber: string;
  name: string;
  phoneNumber: string;
  email: string;
  drivingLicense: string;
  truckTypeId?: number;
  truckType?: ITruckType;
  drivingLicenseAttachment?: string; 
  attachmentFileName?: string;
  attachmentFileType?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isEnable: boolean;
}
