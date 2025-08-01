# Car and Passenger Routing Project

![App Screenshot](./frontend/frontend/public/images/app-screenshot.png)

## Overview

This project simulates a routing system where each car can hold up to **4 passengers**. Cars dynamically decide whether to pick up or drop off passengers based on the current number of passengers inside the car.

The routing logic uses a modified **Breadth-First Search (BFS)** algorithm guided by a **cost map** to optimize routes efficiently. However, this approach is not fully optimal because the cost map is calculated with a simplified assignment model:

The simple **Minimum-Cost Maximum-Flow (MCMF) “assignment”** approach only considers getting each driver from their start location to each passenger’s pickup point, capping each driver at 4 seats. It does **not** model the sequence of jobs — i.e., it does not account for the cost to travel from one passenger’s drop-off location to the next passenger’s pickup location within the same car.

To achieve truly optimal total routing cost, one must solve the assignment and routing problems together or at least incorporate inter-job travel costs into the assignment process.

## Backend

- Implemented in **C++** using the **Crow** web framework.
- Utilizes the **Google Distance Matrix API** for calculating travel times and distances.
- Uses geographic data for accurate routing and mapping.
- To start the backend server:
  - Open the project in your IDE (such as Visual Studio or CLion).
  - Click **Debug** on the CMake target to build and run the server in debug mode.
  - Alternatively, use CMake commands in the terminal to build and run.

## Frontend

- Built with React and **Mapbox GL JS**.
- Loads and animates 3D car and passenger models on a map.
- Visualizes routes with colored lines and numbered points corresponding to passenger pick-up and drop-off locations.
- Uses **GLTFLoader** and **Three.js** for 3D rendering of models.

## Setup Instructions

1. **Mapbox Access Token:**

   Visit [Mapbox Access Tokens](https://docs.mapbox.com/help/dive-deeper/access-tokens/) to create an account and generate your access token.

2. **Google API Key:**

   Go to [Google Maps API Key](https://developers.google.com/maps/documentation/javascript/get-api-key) and click **Get Started** to create your API key.

3. **Configure Environment Variables:**

   - Create a `.env` file in the root of the frontend folder.
   - Add your keys like this:

     ```env
     REACT_APP_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
     REACT_APP_GOOGLE_API_KEY=your_google_api_key_here
     ```

4. **Run Frontend:**

   - Follow your usual React app startup commands, e.g., `npm install` then `npm start`.

5. **Run Backend:**

   - Open your backend project in your IDE.
   - Click **Debug** on the CMake target to build and launch the server.

---

If you want help with anything else — like deployment or more detailed commands — just ask!
