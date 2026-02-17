import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { IonicModule } from '@ionic/angular';
import { tokenHttpInterceptor } from './services/token-http-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([tokenHttpInterceptor])),
    importProvidersFrom(IonicModule.forRoot({}))
  ]
};