export interface IDriver {
  id: number;
  name: string;
  email: string;  
  permisNumber: string;
  phone: string;
  phoneCountry: string;
  status: string;
  idCamion: number;
  isEnable?: boolean;
  zoneId?: number;
  zoneName?:string;
  cityId?: number;
  availabilityStatus?: string; // 'available', 'overtime', 'exceeded', 'conflict'
  availabilityMessage?: string;
  requiresApproval?: boolean;
  totalHours?: number;
  imageBase64: string | null;
}
