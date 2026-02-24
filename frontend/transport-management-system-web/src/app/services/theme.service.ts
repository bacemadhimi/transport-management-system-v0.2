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
    },
    {
      name: 'Gray',
      primary: '#6b7280',
      primaryGradient: 'linear-gradient(135deg, #374151 0%, #6b7280 100%)',
      primaryDark: '#374151',
      sidebarActive: '#6b7280',
      sidebarActiveDark: '#374151'
    },
    {
      name: 'Slate',
      primary: '#64748b',
      primaryGradient: 'linear-gradient(135deg, #334155 0%, #64748b 100%)',
      primaryDark: '#334155',
      sidebarActive: '#64748b',
      sidebarActiveDark: '#334155'
    },
    {
      name: 'Zinc',
      primary: '#71717a',
      primaryGradient: 'linear-gradient(135deg, #3f3f46 0%, #71717a 100%)',
      primaryDark: '#3f3f46',
      sidebarActive: '#71717a',
      sidebarActiveDark: '#3f3f46'
    },
    {
      name: 'Stone',
      primary: '#78716c',
      primaryGradient: 'linear-gradient(135deg, #44403c 0%, #78716c 100%)',
      primaryDark: '#44403c',
      sidebarActive: '#78716c',
      sidebarActiveDark: '#44403c'
    },
    {
      name: 'Brown',
      primary: '#8b5a2b',
      primaryGradient: 'linear-gradient(135deg, #5e3a1a 0%, #8b5a2b 100%)',
      primaryDark: '#5e3a1a',
      sidebarActive: '#8b5a2b',
      sidebarActiveDark: '#5e3a1a'
    },
    {
      name: 'Teal',
      primary: '#14b8a6',
      primaryGradient: 'linear-gradient(135deg, #0e7490 0%, #14b8a6 100%)',
      primaryDark: '#0e7490',
      sidebarActive: '#14b8a6',
      sidebarActiveDark: '#0e7490'
    },
    {
      name: 'Cyan',
      primary: '#06b6d4',
      primaryGradient: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
      primaryDark: '#0891b2',
      sidebarActive: '#06b6d4',
      sidebarActiveDark: '#0891b2'
    },
    {
      name: 'Sky',
      primary: '#0ea5e9',
      primaryGradient: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)',
      primaryDark: '#0369a1',
      sidebarActive: '#0ea5e9',
      sidebarActiveDark: '#0369a1'
    },
    {
      name: 'Violet',
      primary: '#8b5cf6',
      primaryGradient: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)',
      primaryDark: '#6d28d9',
      sidebarActive: '#8b5cf6',
      sidebarActiveDark: '#6d28d9'
    },
    {
      name: 'Fuchsia',
      primary: '#d946ef',
      primaryGradient: 'linear-gradient(135deg, #a21caf 0%, #d946ef 100%)',
      primaryDark: '#a21caf',
      sidebarActive: '#d946ef',
      sidebarActiveDark: '#a21caf'
    },
    {
      name: 'Pink',
      primary: '#ec4899',
      primaryGradient: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)',
      primaryDark: '#be185d',
      sidebarActive: '#ec4899',
      sidebarActiveDark: '#be185d'
    },
    {
      name: 'Red',
      primary: '#ef4444',
      primaryGradient: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)',
      primaryDark: '#b91c1c',
      sidebarActive: '#ef4444',
      sidebarActiveDark: '#b91c1c'
    },
    {
      name: 'Yellow',
      primary: '#eab308',
      primaryGradient: 'linear-gradient(135deg, #a16207 0%, #eab308 100%)',
      primaryDark: '#a16207',
      sidebarActive: '#eab308',
      sidebarActiveDark: '#a16207'
    },
    {
      name: 'Amber',
      primary: '#f59e0b',
      primaryGradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
      primaryDark: '#b45309',
      sidebarActive: '#f59e0b',
      sidebarActiveDark: '#b45309'
    },
    {
      name: 'Lime',
      primary: '#84cc16',
      primaryGradient: 'linear-gradient(135deg, #4d7c0f 0%, #84cc16 100%)',
      primaryDark: '#4d7c0f',
      sidebarActive: '#84cc16',
      sidebarActiveDark: '#4d7c0f'
    },
    {
      name: 'Emerald',
      primary: '#10b981',
      primaryGradient: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
      primaryDark: '#047857',
      sidebarActive: '#10b981',
      sidebarActiveDark: '#047857'
    },
    {
      name: 'Dark',
      primary: '#1e293b',
      primaryGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      primaryDark: '#0f172a',
      sidebarActive: '#1e293b',
      sidebarActiveDark: '#0f172a'
    },
    {
      name: 'Charcoal',
      primary: '#2d3748',
      primaryGradient: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
      primaryDark: '#1a202c',
      sidebarActive: '#2d3748',
      sidebarActiveDark: '#1a202c'
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