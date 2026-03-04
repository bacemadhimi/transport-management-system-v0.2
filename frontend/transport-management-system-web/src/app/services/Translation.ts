import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Translation {


  private translationsSignal = signal<Record<string, string>>({});


  setTranslations(translations: Record<string, string>) {
    this.translationsSignal.set(translations);
  }


  t(key: string): string {
    const translations = this.translationsSignal();
    return translations[key] ?? key;
  }


  get translations() {
    return computed(() => this.translationsSignal());
  }
}