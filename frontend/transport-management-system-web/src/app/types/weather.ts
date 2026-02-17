export interface IWeatherInfo {
  location: string;
  temperature: number;
  feels_like: number;
  description: string;
  icon: string;
  humidity: number;
  wind_speed: number;
  precipitation?: number;
  forecast?: IDailyForecast[];
}

export interface IDailyForecast {
  date: string;
  day: string;
  temperature_min: number;
  temperature_max: number;
  description: string;
  icon: string;
  precipitation_chance: number;
}
export interface InternalDailyForecast {
  date: string;
  temp_min: number;
  temp_max: number;
  description: string;
  icon: string;
  precipitation: number;
}
export interface WeatherData {
  location: string;
  temperature: number;
  feels_like: number;
  description: string;
  icon: string;
  humidity: number;
  wind_speed: number;
  precipitation?: number;
}

export interface DailyForecast {
  date: string;
  day: string;
  temperature_min: number;
  temperature_max: number;
  description: string;
  icon: string;
  precipitation_chance: number;
}
