export interface ITruck {
  id: number;
  immatriculation: string;
  brand: string;
  capacity: number; 
  capacityUnit?: string; 
  currentLoad?: number; 
  loadType?: 'palettes' | 'cartons' | 'mixed'; 
  technicalVisitDate: string | null;
  status: string;
  color: string;
  imageBase64: string | null;
}