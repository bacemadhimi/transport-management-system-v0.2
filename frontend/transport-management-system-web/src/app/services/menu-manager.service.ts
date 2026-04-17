import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type MenuType = 'permissions' | 'notifications' | 'language' | 'theme' | null;

@Injectable({
  providedIn: 'root'
})
export class MenuManagerService {
  private activeMenuSubject = new BehaviorSubject<MenuType>(null);
  activeMenu$ = this.activeMenuSubject.asObservable();

  toggleMenu(menu: MenuType): void {
    const currentMenu = this.activeMenuSubject.value;
    
    if (currentMenu === menu) {
      this.closeAllMenus();
    } else {
      this.activeMenuSubject.next(menu);
    }
  }

  openMenu(menu: MenuType): void {
    this.activeMenuSubject.next(menu);
  }

  closeAllMenus(): void {
    this.activeMenuSubject.next(null);
  }

  isMenuOpen(menu: MenuType): boolean {
    return this.activeMenuSubject.value === menu;
  }

  getActiveMenu(): MenuType {
    return this.activeMenuSubject.value;
  }
}