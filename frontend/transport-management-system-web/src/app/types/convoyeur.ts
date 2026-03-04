import { IEmployee } from "./employee";

export interface IConvoyeur extends IEmployee {
  employeeCategory: "CONVOYEUR";


  matricule?: string;
  status?: string;
  zoneId?: number;
  cityId?: number;





}