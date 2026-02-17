export interface PieChartData {
  label: string;
  value: number;
  color?: string;
  count: number;
}

export interface StatisticsFilter {
  startDate?: Date;
  endDate?: Date;
  truckId?: number;
  driverId?: number;
}

export interface TripStatistics {
  statusDistribution: PieChartData[];
  truckUtilization: PieChartData[];
  deliveryByType: PieChartData[];
  generatedAt: Date;
}

export interface Truck {
  id: number;
  licensePlate: string;
  model: string;
  capacity: string;
  status: 'active' | 'maintenance' | 'inactive';
  driverId?: number;
}

export interface Driver {
  id: number;
  name: string;
  licenseNumber: string;
  status: 'available' | 'on_trip' | 'off_duty';
  phone?: string;
  email?: string;
}