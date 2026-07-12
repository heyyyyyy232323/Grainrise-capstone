# GrainRise — Setup Guide

## Prerequisites
Make sure you have these installed before starting:
- **Python 3.10+**
- **Node.js 18+**
- **npm**

---

## 1. Backend (Django)

```bash
# Go to the backend folder
cd backend

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Start the server
python manage.py runserver 0.0.0.0:8000
```

> API will be live at **http://localhost:8000**
>
> Default accounts seeded automatically:
> - `admin` / `admin123`
> - `farmer` / `farmer123`

---

## 2. Web Frontend (React + Vite)

Open a **new terminal**, then:

```bash
# Go to the web-frontend folder
cd web-frontend

npm install react-router-dom
npm install lucide-react

# Install dependencies

# Start the dev server
npm run dev
```

> Website will be live at **http://localhost:5173**

---

## 3. Mobile App (React Native / Expo)

Open a **new terminal**, then:

```bash
# Go to the mobile-app folder
cd mobile-app

# Install dependencies
npm install

# Start Expo
npx expo start


# to fix this 

Run:
npx expo install expo@~54.0.0

then:
npx expo install --fix

Then, clear  cache:
npx expo start -c
```

> Scan the QR code with the **Expo Go** app on your phone,
> or press `w` for web, `a` for Android emulator, `i` for iOS simulator.

---

## Quick Summary

| Service      | Command                          | URL / Access              |
|--------------|----------------------------------|---------------------------|
| Backend      | `python manage.py runserver`     | http://localhost:8000     |
| Web Frontend | `npm run dev`                    | http://localhost:5173     |
| Mobile App   | `npx expo start`                 | Expo QR / emulator        |

> **Run all three in separate terminals at the same time.**
