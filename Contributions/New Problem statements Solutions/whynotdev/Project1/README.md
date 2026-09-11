# Incident Response Platform

A responsive React frontend and Spring Boot backend for the Incident Response and Root Cause Analysis challenge.

## Structure

- `frontend/` - Vite React application with the initial landing page and local mock preview data.
- `backend/` - Spring Boot 3 application with an in-memory incident service and `/api/health` endpoint.

## Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

## Run the backend

```powershell
cd backend
mvn spring-boot:run
```

Backend health check: `http://localhost:8080/api/health`
