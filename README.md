# GrainRise — Setup Guide

This guide details the instructions to configure and run the backend, web frontend, and mobile application for the GrainRise capstone project.

---

## Prerequisites
Ensure the following are installed:
- **Python 3.10+**
- **Node.js 18+** & **npm**

---

## 1. Backend (Django)

The backend is built with Django and includes a pre-configured Python virtual environment (`.venv`) inside the `backend` folder.

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Activate the Virtual Environment:**
   * **Windows (PowerShell):**
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   * **Windows (Command Prompt):**
     ```cmd
     .venv\Scripts\activate.bat
     ```
   * **macOS / Linux:**
     ```bash
     source .venv/bin/activate
     ```

3. **Install Dependencies** (if needed):
   ```bash
   pip install -r requirements.txt
   ```

4. **Run Database Migrations** (if needed):
   ```bash
   python manage.py migrate
   ```

5. **Start the Server:**
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

> 🌐 **Backend API live at:** [http://localhost:8000](http://localhost:8000)
>
> **Default seeded accounts:**
> - Admin: `admin` / `admin123`
> - Farmer: `farmer` / `farmer123`

---

## 2. Web Frontend (React + Vite)

The frontend is a React application powered by Vite.

1. **Navigate to the web frontend directory:**
   ```bash
   cd web-frontend
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```

> 🌐 **Web App live at:** [http://localhost:5173](http://localhost:5173)

---

## 3. Mobile App (React Native / Expo)

1. **Navigate to the mobile app directory:**
   ```bash
   cd mobile-app
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Start the Expo server:**
   ```bash
   npx expo start
   ```

   *If you encounter dependency errors, run:*
   ```bash
   npx expo install expo@~54.0.0
   npx expo install --fix
   npx expo start -c
   ```

> 📱 Scan the QR code using the **Expo Go** app on your phone, or press `w` for web, `a` for Android emulator, `i` for iOS simulator.

---

## Quick Summary

To run everything simultaneously, open separate terminals and run:

| Service | Directory | Command | URL / Access |
| :--- | :--- | :--- | :--- |
| **Backend** | `backend` | `.venv\Scripts\Activate` <br> `python manage.py runserver` | [http://localhost:8000](http://localhost:8000) |
| **Web Frontend** | `web-frontend` | `npm run dev` | [http://localhost:5173](http://localhost:5173) |
| **Mobile App** | `mobile-app` | `npx expo start` | Expo Go App / Emulator |

