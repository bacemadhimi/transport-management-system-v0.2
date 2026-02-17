import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

@Injectable()
export class FrDateAdapter extends NativeDateAdapter {
  // Affichage dans l'input
  override format(date: Date, displayFormat: Object): string {
    const day = this._to2digit(date.getDate());
    const month = this._to2digit(date.getMonth() + 1);
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private _to2digit(n: number): string {
    return ('00' + n).slice(-2);
  }

  // Parser pour que l'utilisateur puisse taper "dd/MM/yyyy"
  override parse(value: any): Date | null {
    if (typeof value === 'string') {
      const parts = value.split('/');
      if (parts.length === 3) {
        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const year = Number(parts[2]);
        return new Date(year, month, day);
      }
    }
    return null;
  }
}
