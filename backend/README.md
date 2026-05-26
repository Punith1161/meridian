## MERIDIAN FastAPI Backend

### 1. Setup

```bash
cd /home/punith/Linux/MERIDIAN/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure environment

Create or update `.env`:

```env
DATABASE_URL=sqlite:///./meridian.db
SECRET_KEY=replace-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
FRONTEND_URLS=http://localhost:5173
```

### 3. Run API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health endpoint:

```text
http://localhost:8000/api/healthz
```

## Run Full Stack With One Command

From repo root:

```bash
cd /home/punith/Linux/MERIDIAN
./meridian.sh
```

Optional port overrides:

```bash
BACKEND_PORT=8000 FRONTEND_PORT=5173 ./meridian.sh
```

## Run Production-Like Mode

From repo root:

```bash
cd /home/punith/Linux/MERIDIAN
./meridian-prod.sh
```

Optional port overrides:

```bash
BACKEND_PORT=8000 FRONTEND_PORT=4173 ./meridian-prod.sh
```
