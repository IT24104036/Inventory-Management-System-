# Invigo FreshGuard

Invigo FreshGuard is a multi-service inventory and expiry-risk platform for retail operations.

It includes:

- a React + Vite frontend in `src`
- a Spring Boot backend in `Invigo`
- a FastAPI ML service in `AIML`

## What Was Improved

This cleanup focused on security, reliability, and maintainability:

- backend secrets now come from environment variables instead of committed values
- login now uses username or email only, and the backend decides the user role
- onboarding emails now send secure setup instructions instead of raw passwords
- password length rules are enforced on both frontend and backend
- frontend API access is centralized behind shared config helpers
- lint and test configuration now match the real JavaScript codebase
- the ML service now has dependency setup, environment-based model paths, and a health endpoint

## Frontend

From the repo root:

```bash
npm install
npm run dev
```

Environment file:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

You can copy values from `.env.example`.

## Backend

From `Invigo`:

```bash
./mvnw spring-boot:run
```

Set the variables shown in `Invigo/.env.example` first.

Important backend values:

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `APP_FRONTEND_BASE_URL`
- `APP_CORS_ALLOWED_ORIGINS`
- `ML_API_URL`

## ML Service

From `AIML`:

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Optional ML variable:

```env
MODEL_PATH=./expiry_risk_model.pkl
```

Useful endpoints:

- `GET /`
- `GET /health`
- `POST /predict`
- `POST /predict-batch`

## Recommended Start Order

1. Start the database.
2. Start the ML service on port `8000`.
3. Start the Spring Boot backend on port `8080`.
4. Start the frontend on port `5173`.

## Verification Commands

Frontend:

```bash
npm test
npm run lint
```

Backend:

```bash
./mvnw test
```

## Notes

- `application.properties` now expects environment variables instead of committed secrets.
- New staff onboarding sends secure password setup instructions.
- The login page no longer asks users to choose a role manually.
