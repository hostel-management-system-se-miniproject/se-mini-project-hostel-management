# HMS-01 Scaffold Setup (Windows)

This scaffold uses React + Vite for the frontend, Node.js + Express for the REST API, and MongoDB through Mongoose. The browser talks to the API; it must never connect directly to MongoDB.

## Prerequisites
- Node.js 20 or newer and npm
- A running local MongoDB server or a MongoDB Atlas URI

## Backend
1. Open Command Prompt in `backend`.
2. Run `copy .env.example .env`.
3. Open `backend/.env` and confirm `MONGODB_URI` points to your local database or your own Atlas URI. Do not commit `.env`.
4. Set `MONGODB_URI_TEST` in `backend/.env` to a separate database whose name ends in `_test`.
5. Run `npm install`.
6. Run `npm test`, `npm run lint`, and `npm run check`.
7. Run `npm run dev`.
8. Open `http://localhost:5000/health`. A healthy response has HTTP 200 and JSON with `status: "ok"` and `database: "connected"`.

## Frontend
1. Open a second Command Prompt in `frontend`.
2. Run `npm install`.
3. Optional: copy `.env.example` to `.env` if the API URL differs from `http://localhost:5000`.
4. Run `npm run lint`.
5. Run `npm test`.
6. Run `npm run build`.
7. Run `npm run dev` and open the URL printed by Vite (normally `http://localhost:5173`).

The frontend displays the frontend, API, and database status. Keep both dev servers running while checking the page.

## Security
- Never commit `.env`, passwords, or real database credentials.
- The local MongoDB server shown in the setup may have access control disabled. Keep it bound to localhost and use only development/test data until authentication is configured.
