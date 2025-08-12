# FastAPI Backend Template

A lightweight Python backend template using **FastAPI** as the web framework. Supports local development with Uvicorn and deployment with Docker or Railway, including CORS configuration for frontend integration.

## Prerequisites

- Python 3.10+
- [pip](https://pip.pypa.io/) or [uv](https://docs.astral.sh/uv/) for dependency management
- Docker (optional, for containerized deployments)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
PORT=8080
CORS_ORIGINS=https://your-frontend-url.com,http://localhost:5173
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY_HERE
```

### 3. Install Dependencies

```bash
# Generate requirements file (if using uv)
uv pip freeze > requirements.txt

# Install dependencies
uv pip install -r requirements.txt
```

### 4. Run Locally

```bash
uvicorn main:app --reload --host 0.0.0.0 --port $PORT
```

Your backend will be running at: http://localhost:8080

## Docker Deployment (Optional)

### Create Dockerfile

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### Build and Run Container

```bash
# Build the Docker image
docker build -t fastapi-backend .

# Run the container
docker run -p 8080:8080 fastapi-backend
```
