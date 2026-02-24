import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

export interface Theme {
  name: string;
  primary: string;
  primaryGradient: string;
  primaryDark: string;
  sidebarActive: string;
  sidebarActiveDark: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private currentTheme!: Theme;
  
  themes: Theme[] = [
    {
      name: 'Blue',
      primary: '#3b82f6',
      primaryGradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
      primaryDark: '#1d4ed8',
      sidebarActive: '#3b82f6',
      sidebarActiveDark: '#1d4ed8'
    },
    {
      name: 'Green',
      primary: '#10b981',
      primaryGradient: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
      primaryDark: '#047857',
      sidebarActive: '#10b981',
      sidebarActiveDark: '#047857'
    },
    {
      name: 'Purple',
      primary: '#8b5cf6',
      primaryGradient: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)',
      primaryDark: '#6d28d9',
      sidebarActive: '#8b5cf6',
      sidebarActiveDark: '#6d28d9'
    },
    {
      name: 'Orange',
      primary: '#f97316',
      primaryGradient: 'linear-gradient(135deg, #c2410c 0%, #f97316 100%)',
      primaryDark: '#c2410c',
      sidebarActive: '#f97316',
      sidebarActiveDark: '#c2410c'
    },
    {
      name: 'Rose',
      primary: '#f43f5e',
      primaryGradient: 'linear-gradient(135deg, #be123c 0%, #f43f5e 100%)',
      primaryDark: '#be123c',
      sidebarActive: '#f43f5e',
      sidebarActiveDark: '#be123c'
    },
    {
      name: 'Indigo',
      primary: '#6366f1',
      primaryGradient: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
      primaryDark: '#4338ca',
      sidebarActive: '#6366f1',
      sidebarActiveDark: '#4338ca'
    }
  ];

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.loadTheme();
  }

  setTheme(theme: Theme) {
    this.currentTheme = theme;
    
    // Apply CSS variables to root element
    document.documentElement.style.setProperty('--primary-color', theme.primary);
    document.documentElement.style.setProperty('--primary-gradient', theme.primaryGradient);
    document.documentElement.style.setProperty('--primary-dark', theme.primaryDark);
    document.documentElement.style.setProperty('--sidebar-active', theme.sidebarActive);
    document.documentElement.style.setProperty('--sidebar-active-dark', theme.sidebarActiveDark);
    
    // Set RGB values for opacity effects
    const rgb = this.hexToRgb(theme.primary);
    if (rgb) {
      document.documentElement.style.setProperty('--primary-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
    
    // Save to localStorage
    localStorage.setItem('selectedTheme', theme.name);
  }

  getThemes(): Theme[] {
    return this.themes;
  }

  getCurrentTheme(): Theme {
    return this.currentTheme || this.themes[0];
  }

  loadTheme() {
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme) {
      const theme = this.themes.find(t => t.name === savedTheme);
      if (theme) {
        this.setTheme(theme);
        return;
      }
    }
    // Default theme
    this.setTheme(this.themes[0]);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}