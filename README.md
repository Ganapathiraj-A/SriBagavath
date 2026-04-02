# Sri Bagavath Mobile Application

[![Release](https://img.shields.io/github/v/release/Ganapathiraj-A/SriBagavath?label=Latest%20APK)](https://github.com/Ganapathiraj-A/SriBagavath/releases/latest)
[![Play Store](https://img.shields.io/badge/Google%20Play-Store-green.svg?logo=google-play)](https://play.google.com/store/apps/details?id=com.bhavathpathai.app)
[![Build](https://img.shields.io/badge/Platform-Android-green.svg)](https://developer.android.com/studio)
[![Framework](https://img.shields.io/badge/Framework-React%20%2B%20Capacitor-blue.svg)](https://capacitorjs.com/)

The official **Sri Bagavath** mobile application, designed to provide seamless access to spiritual literature, media, and program management. Built with a modern React frontend and a robust Firebase backend, the app offers a premium experience for both users and administrators.

---

## 🌟 Key Features

### 📖 E-Media & Bookstore
- **Print Books**: Browse and purchase physical books via Integrated Razorpay payments.
- **Digital Books**: Read PDF versions with a custom-built, offline-capable viewer.
- **Audio & Video**: High-quality streaming for audiobooks and YouTube-integrated video lessons.
- **Monthly Magazine**: Automatic synchronization with Google Drive for the latest spiritual journals.

### 🗓 Programs & Events
- **Live Schedules**: Real-time access to "Ayya's Schedule" and upcoming Satsangs.
- **Easy Registration**: One-tap registration for programs and camps.
- **Recorded Content**: Access to a curated catalog of past program recordings.

### 🔐 Admin & Management
- **Unified Hub**: Centralized control for books, media, and user permissions.
- **WhatsApp Integration**: Automated messaging for program updates and notifications.
- **Analytics**: Built-in tracking for app usage and system health.

---

## 🛠 Tech Stack

- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Mobile Bridge**: [Capacitor](https://capacitorjs.com/)
- **Backend**: [Firebase](https://firebase.google.com/) (Auth, Firestore, Cloud Functions, Storage)
- **Styling**: Vanilla CSS with [Framer Motion](https://www.framer.com/motion/) animations.
- **Payments**: [Razorpay](https://razorpay.com/)
- **Messaging**: [Green-API](https://green-api.com/) for WhatsApp integration.

---

## 🚀 Quick Start

To set up the development environment, follow these steps:

1.  **Clone & Install**:
    ```bash
    git clone https://github.com/Ganapathiraj-A/SriBagavath.git
    npm install
    ```
2.  **Restore Secrets**:
    The project uses a password-protected archive for sensitive keys.
    ```bash
    unzip -P <PASSWORD> secrets.zip
    ```
    *(See [README_SETUP.md](README_SETUP.md) for more details on secrets management)*.

3.  **Firebase Access**:
    - **Production**: [antigravity-app-5c1ff](https://console.firebase.google.com/project/antigravity-app-5c1ff)
    - **Development**: [sri-bagavath-dev](https://console.firebase.google.com/project/sri-bagavath-dev)

4.  **Run Development Build**:
    ```bash
    ./publish.sh dev
    ```

### 📱 App Links
- **Google Play Store**: [Install from Play Store](https://play.google.com/store/apps/details?id=com.bhavathpathai.app)
- **Direct Download**: [Latest APK (GitHub)](https://github.com/Ganapathiraj-A/SriBagavath/releases/latest)

---

## 🏗 Build & Maintenance

The project features a **Unified Build System** to handle different environments:

- **Dev Build**: `npm run build:apk:dev` (Package: `com.bhavathpathai.app.dev`)
- **Production APK**: `npm run build:apk:prod` (Package: `com.bhavathpathai.app`)
- **Play Store AAB**: `npm run build:aab:prod`

For detailed build system information, see [BUILD_SYSTEM.md](BUILD_SYSTEM.md).

---

## 📝 License

Copyright © 2026 Sri Bagavath. All rights reserved.
