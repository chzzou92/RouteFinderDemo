# Car and Passenger Routing Project

![App Screenshot](https://github.com/chzzou92/RouteFinderDemo/blob/old-main/frontend/frontend/public/Images/app-screenshot.png?raw=true)

## Live Demo

**[Try the live application here](https://route-finder-demo-git-prod-chzzou92s-projects.vercel.app/)**

*Frontend deployed on Vercel | Backend deployed on Railway*

## Overview

This project simulates a routing system where each car can hold up to **4 passengers**. Cars dynamically decide whether to pick up or drop off passengers based on the current number of passengers inside the car.

The routing logic uses a modified **Breadth-First Search (BFS)** algorithm guided by a **cost map** to optimize routes efficiently. However, this approach is not fully optimal because the cost map is calculated with a simplified assignment model:

The simple **Minimum-Cost Maximum-Flow (MCMF) "assignment"** approach only considers getting each driver from their start location to each passenger's pickup point, capping each driver at 4 seats. It does **not** model the sequence of jobs — i.e., it does not account for the cost to travel from one passenger's drop-off location to the next passenger's pickup location within the same car.

To achieve truly optimal total routing cost, one must solve the assignment and routing problems together or at least incorporate inter-job travel costs into the assignment process.

## Backend

- Implemented in **Python** using the **FastAPI** web framework
- Utilizes the **Google Distance Matrix API** for calculating travel times and distances
- Uses geographic data for accurate routing and mapping
- Includes CORS configuration for frontend integration

## Frontend

- Built with React and **Mapbox GL JS**
- Loads and animates 3D car and passenger models on a map
- Visualizes routes with colored lines and numbered points corresponding to passenger pick-up and drop-off locations
- Uses **GLTFLoader** and **Three.js** for 3D rendering of models

## Prerequisites

- Python 3.10+
- [pip](https://pip.pypa.io/) or [uv](https://docs.astral.sh/uv/) for dependency management
- Docker (optional, for containerized deployments)

## Setup Instructions

### 1. API Keys and Access Tokens

**Mapbox Access Token:**
Visit [Mapbox Access Tokens](https://docs.mapbox.com/help/dive-deeper/access-tokens/) to create an account and generate your access token.

**Google API Key:**
Go to [Google Maps API Key](https://developers.google.com/maps/documentation/javascript/get-api-key) and click **Get Started** to create your API key.

### 2. Frontend Environment Configuration

Create a `.env` file in the root of the frontend folder:

```env
REACT_APP_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
REACT_APP_GOOGLE_API_KEY=your_google_api_key_here
```

### 3. Backend Environment Configuration

Create a `.env` file in the backend project root:

```env
PORT=8080
CORS_ORIGINS=https://your-frontend-url.com,http://localhost:5173
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY_HERE
```

### 4. Clone the Repository

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

### 5. Install Backend Dependencies

```bash
# Generate requirements file (if using uv)
uv pip freeze > requirements.txt

# Install dependencies
uv pip install -r requirements.txt
```

### 6. Run Backend

```bash
uvicorn main:app --reload --host 0.0.0.0 --port $PORT
```

Your backend will be running at: http://localhost:8080

### 7. Run Frontend

Follow your usual React app startup commands:

```bash
cd frontend
npm install
npm start
```

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
