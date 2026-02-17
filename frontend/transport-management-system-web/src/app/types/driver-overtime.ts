export interface DriverAvailabilityDto {
  driverId: number;
  driverName: string;
  permisNumber: string;
  isAvailable: boolean;
  status: 'available' | 'overtime' | 'exceeded';
  statusMessage: string;
  totalHours: number;
  maxNormalHours: number;
  overtimeHours: number;
  requiresApproval: boolean;
  statusColor: string;
  statusIcon: string;
}

export interface AvailabilityRequestDto {
  date: string; // format: YYYY-MM-DD
  tripDuration: number;
  zoneId?: number;
  excludeTripId?: number;
}

export interface DriverOvertimeCheckDto {
  driverId: number;
  date: string;
  tripDuration: number;
  excludeTripId?: number;
}

export interface DriverOvertimeResultDto {
  driverId: number;
  driverName: string;
  isAvailable: boolean;
  status: 'available' | 'overtime' | 'exceeded';
  message: string;
  totalDailyHours: number;
  maxNormalHours: number;
  maxTotalHours: number;
  newOvertimeHours: number;
  remainingNormalHours: number;
  remainingOvertimeHours: number;
  requiresApproval: boolean;
  existingTrips: DriverTripInfoDto[];
}

export interface DriverTripInfoDto {
  tripId: number;
  tripReference: string;
  duration: number;
  startDate: Date;
  status: string;
}
