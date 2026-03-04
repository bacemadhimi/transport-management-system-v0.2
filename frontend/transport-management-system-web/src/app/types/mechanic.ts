import { IEmployee } from "./employee";

export interface IMechanic extends IEmployee {
  employeeCategory: "MECHANIC";
}