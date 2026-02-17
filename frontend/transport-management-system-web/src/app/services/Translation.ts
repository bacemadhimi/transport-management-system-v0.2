import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Translation {

  // Signal pour stocker toutes les traductions
  private translationsSignal = signal<Record<string, string>>({});

  // ✅ Méthode pour définir les traductions
  setTranslations(translations: Record<string, string>) {
    this.translationsSignal.set(translations);
  }

  // ✅ Méthode pour récupérer une traduction par clé
  t(key: string): string {
    const translations = this.translationsSignal();
    return translations[key] ?? key; // si pas trouvé, retourne la clé elle-même
  }

  // Optionnel : récupérer toutes les traductions (reactive)
  get translations() {
    return computed(() => this.translationsSignal());
  }
}
