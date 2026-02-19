import { ITypeTruck } from './type-truck';

export interface IEmployee {
  id: number;
  idNumber: string;
  name: string;
  phoneNumber: string;
  email: string;
  drivingLicense: string;
  truckTypeId?: number;
  truckType?: ITypeTruck;
  drivingLicenseAttachment?: string; 
  attachmentFileName?: string;
  attachmentFileType?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isEnable: boolean;
}
