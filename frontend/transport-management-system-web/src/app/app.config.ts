import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {provideNativeDateAdapter} from '@angular/material/core';
import { tokenHttpInterceptor } from './services/token-http-interceptor';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([tokenHttpInterceptor])),
    provideNativeDateAdapter(), 
    provideCharts(withDefaultRegisterables()), provideCharts(withDefaultRegisterables()), provideCharts(withDefaultRegisterables()),
   
  ],
};
