# SmartHome Runtime UI + Cloud API

โปรเจกต์นี้แก้ปัญหาเดิมของหน้าเว็บบน ESP8266 ที่
- ใช้ได้เฉพาะในวง WiFi เดียวกัน
- UI ถูกเขียนเป็น HTML แบบ fixed

แนวทางใหม่:
- `frontend` เป็นเว็บ client ที่ render หน้าจอจาก schema (Button, EditText, Label) แบบ runtime
- `backend` เป็น API กลางเชื่อม MongoDB Atlas
- `esp8266` เป็นตัวอย่างการเชื่อมอุปกรณ์เข้ากับ API เพื่อรับคำสั่งจาก cloud

## Architecture

1. ผู้ใช้เปิดเว็บ (host ได้บน GitHub Pages / Vercel / Netlify)
2. เว็บโหลดฟอร์มจาก `GET /api/forms/:slug`
3. เว็บ render component ตามประเภท (`label`, `button`, `editText`)
4. เมื่อกดปุ่ม เว็บส่ง command ไปที่ `POST /api/devices/:deviceId/commands`
5. ESP8266 poll คำสั่งจาก cloud แล้ว ACK กลับ

## Quick Start

### 1) Backend

```powershell
cd backend
copy .env.example .env
npm install
npm run seed
npm run dev
```

กำหนดค่าใน `.env`:
- `MONGODB_URI` (MongoDB Atlas connection string)
- `PORT` (default `8080`)
- `CORS_ORIGIN` เช่น `http://127.0.0.1:5500`

### 2) Frontend

เปิดไฟล์ `frontend/index.html` ด้วย static server ใดก็ได้ เช่น:

```powershell
cd frontend
npx serve .
```

จากนั้นแก้ค่าใน `frontend/app.js`:
- `API_BASE_URL`
- `FORM_SLUG`
- `DEVICE_ID`

### 3) ESP8266

ไฟล์ตัวอย่าง: `esp8266/SmartHomeClient.ino`
- เชื่อม WiFi
- poll command
- ACK command
- update สถานะล่าสุด

## Mongo Schema (หลัก)

### Form
- `slug`: string (unique)
- `title`: string
- `components`: array
  - `id`: string
  - `type`: `label` | `button` | `editText`
  - `text`: string
  - `placeholder`: string
  - `bindingKey`: string (สำหรับ editText)
  - `action`: object (สำหรับ button)
  - `style`: object

### Device
- `deviceId`: string (unique)
- `state`: object
- `pendingCommands`: array
  - `commandId`
  - `controlId`
  - `payload`
  - `createdAt`
  - `deliveredAt`
  - `ackedAt`
  - `status`

## API Summary

- `GET /health`
- `GET /api/forms/:slug`
- `PUT /api/forms/:slug`
- `POST /api/devices/:deviceId/commands`
- `GET /api/devices/:deviceId/commands/next`
- `POST /api/devices/:deviceId/commands/:commandId/ack`
- `POST /api/devices/:deviceId/state`
- `GET /api/devices/:deviceId/state`

## Deploy Suggestion

- Frontend: GitHub Pages
- Backend: Render / Railway / Fly.io
- DB: MongoDB Atlas

สถาปัตยกรรมนี้ทำให้ UI เปลี่ยนได้จากฐานข้อมูลทันที โดยไม่ต้องแฟลช firmware ใหม่แค่เพื่อแก้ HTML.
