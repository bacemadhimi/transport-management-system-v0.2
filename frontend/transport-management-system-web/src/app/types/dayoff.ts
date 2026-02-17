export interface IDayOff {
  id: number;
  country: string;
  date: Date | string;
  name: string;
  description?: string;
  createdDate: Date;
}