# TMS Driver Mobile Application

A modern, scalable mobile application for Transportation Management System (TMS) drivers, built with Ionic Angular and Capacitor.

## 🏗️ Architecture

This application follows a modern Angular standalone architecture, inspired by the TMS web application, with mobile-specific optimizations.

### 📁 Project Structure

```
src/app/
├── components/          # Reusable UI components
├── pages/              # Feature pages (screens)
│   ├── home/           # Driver dashboard
│   └── login/          # Authentication page
├── services/           # Business logic & API services
│   ├── auth.service.ts # Authentication management
│   └── auth.guard.ts   # Route protection
├── types/              # TypeScript interfaces
│   └── auth.ts         # Authentication types
├── app.config.ts       # Standalone app configuration
├── app.routes.ts       # Route definitions
└── app.component.ts    # Root component
```

### 🚀 Key Features

- **Standalone Architecture**: Modern Angular without NgModules
- **Reactive State**: Using Angular signals for state management
- **Type Safety**: Strong TypeScript interfaces
- **Mobile Optimized**: Ionic components for native mobile experience
- **Authentication**: JWT-based auth with route guards
- **Capacitor Ready**: Cross-platform mobile deployment

### 🛠️ Technologies

- **Framework**: Angular 20 (Standalone Components)
- **UI Library**: Ionic 8
- **Mobile Runtime**: Capacitor 8
- **Language**: TypeScript
- **State Management**: Angular Signals
- **Styling**: SCSS with Ionic Design System

## 📱 Development Setup

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Ionic CLI: `npm install -g @ionic/cli`
- Android Studio (for Android development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd TMS

# Install dependencies
npm install

# Start development server
npm start
# or
ionic serve
```

## 🚀 Build & Deployment

### Web Build
```bash
# Build for web
npm run build
# or
ionic build
```

### Android Deployment

```bash
# Build the web assets
ionic build

# Add Android platform
ionic cap add android

# Copy web assets to native project
ionic cap copy android

# Sync dependencies (optional, updates plugins)
ionic cap sync android

# Open in Android Studio
ionic cap open android
```

### iOS Deployment (Future)

```bash
# Add iOS platform
ionic cap add ios

# Copy web assets
ionic cap copy ios

# Open in Xcode
ionic cap open ios
```

## 🔧 Development Commands

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Generate new page
ionic generate page pages/page-name

# Generate new service
ionic generate service services/service-name
```

## 📋 Features

### Current Features
- ✅ User Authentication (Login/Logout)
- ✅ Protected Routes
- ✅ Driver Dashboard
- ✅ Responsive Mobile UI
- ✅ Token-based Authentication

### Planned Features
- 🔄 SQLite Database Integration
- 🔄 Trip Management
- 🔄 Real-time GPS Tracking
- 🔄 Offline Mode
- 🔄 Push Notifications

## 🔐 Authentication Flow

1. **Login**: User enters credentials
2. **Token Storage**: JWT stored in localStorage
3. **Route Protection**: AuthGuard validates access
4. **Auto Logout**: Token expiration handling

## 📊 API Integration

The app is designed to integrate with the TMS backend API:

- **Base URL**: Configurable via environment
- **Authentication**: Bearer token
- **Endpoints**: RESTful API design

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests (when implemented)
npm run e2e
```

## 📦 Scripts

- `npm start` - Development server
- `npm run build` - Production build
- `npm test` - Unit tests
- `npm run lint` - Code linting

## 🤝 Contributing

1. Follow the established architecture patterns
2. Use standalone components
3. Implement proper TypeScript types
4. Add tests for new features
5. Follow Ionic/Angular best practices

## 📄 License

This project is part of the TMS (Transportation Management System) suite.

---

**Built with ❤️ for TMS Drivers**