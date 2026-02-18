export interface ITruckType {
  id: number;
  type: string;
  capacity: number;
  unit: string;
  createdAt?: Date;
  updatedAt?: Date;
  isEnable: boolean;
}
