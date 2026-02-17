export interface ICustomer {
  id: number;
  name: string;
  phone: string;
  phoneCountry: string;
  email: string;
  adress: string;
  matricule: string;
  gouvernorat: string;
  contact: string;
  sourceSystem?: string; 
  zoneId?:number;
  city:string;
  zoneName?:string;
}