export interface IOvertimeSetting {
  id: number;
  driverId: number;
  driverName: string;
  isActive: boolean;
  maxDailyHours: number;
  maxWeeklyHours: number;
  overtimeRatePerHour: number;
  allowWeekendOvertime: boolean;
  allowHolidayOvertime: boolean;
  weekendRateMultiplier?: number;
  holidayRateMultiplier?: number;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ICreateOvertimeSetting {
  driverId: number;
  isActive: boolean;
  maxDailyHours: number;
  maxWeeklyHours: number;
  overtimeRatePerHour: number;
  allowWeekendOvertime: boolean;
  allowHolidayOvertime: boolean;
  weekendRateMultiplier?: number;
  holidayRateMultiplier?: number;
  notes?: string;
}