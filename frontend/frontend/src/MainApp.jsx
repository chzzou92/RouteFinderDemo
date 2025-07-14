import { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import SendData from "./Fetch";
import "mapbox-gl/dist/mapbox-gl.css";
import "./App.css";
import { useNavigate } from "react-router-dom";

const INITIAL_CENTER = [-74.4981, 40.4974];
const INITIAL_ZOOM = 10.65;

export default function MainApp() {
  const { state } = useLocation();
  const { passengersMap, driversMap } = state || {};
  const mapRef = useRef();
  const mapContainerRef = useRef();
  const [center, setCenter] = useState(INITIAL_CENTER);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const routesRef = useRef([]);
  const markersRef = useRef([]);
  const drivers = [[-74.4927, 40.4174]];
  const passengers = [
    [
      [-74.436765, 40.439562],
      [-74.674849, 40.452963],
    ],
    [
      [-74.43755, 40.525454],
      [-74.31936, 40.563496],
    ],
    [
      [-74.48454, 40.56596],
      [-74.611447, 40.555897],
    ],
    [
      [-74.434529, 40.480098],
      [-74.41297, 40.343104],
    ],
    [
      [-74.44878, 40.482294],
      [-74.570587, 40.340292],
    ],
    [
      [-74.449443, 40.592058],
      [-74.375534, 40.694155],
    ],
    [
      [-74.452944, 40.484038],
      [-74.267957, 40.461627],
    ],
    [
      [-74.53506, 40.485142],
      [-74.469859, 40.615775],
    ],
    [
      [-74.37787, 40.47876],
      [-74.29261, 40.570663],
    ],
    [
      [-74.462616, 40.487974],
      [-74.581453, 40.407822],
    ],
  ];
  const logMaps = () => {
    console.log("=== Drivers Map ===");
    driversMap.forEach((cords, index) => {
      if (cords) {
        console.log(`Driver ${index}: [${cords[0]}, ${cords[1]}]`);
      } else {
        console.log(`Driver ${index}: Not set`);
      }
    });

    console.log("=== Passengers Map ===");
    passengersMap.forEach((pair, index) => {
      const [pickup, dropoff] = pair;
      const pickupStr = pickup ? `[${pickup[0]}, ${pickup[1]}]` : "Not set";
      const dropoffStr = dropoff ? `[${dropoff[0]}, ${dropoff[1]}]` : "Not set";
      console.log(
        `Passenger ${index}:\n  Pickup: ${pickupStr}\n  Dropoff: ${dropoffStr}`
      );
    });
  };

  const navigate = useNavigate();
  const handleBack = () => {
    navigate("/route");
  };

  const removeMarkers = () => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    const map = mapRef.current;
    if (!map || !map.getSource("routes")) return;

    routesRef.current = [];

    map.getSource("routes").setData({
      type: "FeatureCollection",
      features: [],
    });
  };
  const addMarker = (lng, lat, color) => {
    const Marker = new mapboxgl.Marker({ color })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);
    markersRef.current.push(Marker);
  };

  const MAPBOX_API_KEY = import.meta.env.VITE_MAPBOX_TOKEN;
  if (!MAPBOX_API_KEY) {
    console.error("Mapbox API key not found. Please add it to your .env file.");
  }

  useEffect(() => {
    logMaps();
    mapboxgl.accessToken = MAPBOX_API_KEY;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      center,
      zoom,
    });

    mapRef.current.on("move", () => {
      const mapCenter = mapRef.current.getCenter();
      setCenter([mapCenter.lng, mapCenter.lat]);
      setZoom(mapRef.current.getZoom());
    });

    return () => {
      mapRef.current.remove();
    };
  }, []);

  const handleButtonClick = () => {
    mapRef.current.flyTo({
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    });
  };

  async function getRoute(start, end) {
    const map = mapRef.current;
    if (!map) return null;
    console.log("Requesting route from", start, "to", end);

    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
        `${start[0]},${start[1]};${end[0]},${end[1]}` +
        `?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
    );
    const json = await res.json();
    const geom = json.routes[0].geometry;

    const feature = {
      type: "Feature",
      properties: {},
      geometry: geom,
    };

    if (!map.getSource("routes")) {
      map.addSource("routes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "routes-line",
        type: "line",
        source: "routes",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#3887be", "line-width": 4 },
      });
      routesRef.current = [];
    }

    routesRef.current.push(feature);
    map.getSource("routes").setData({
      type: "FeatureCollection",
      features: routesRef.current,
    });

    return feature;
  }

  async function getTime(start, end) {
    const map = mapRef.current;
    if (!map) return;

    const feature = await getRoute(start, end);
    if (!feature) return;

    const coordString = `${start[0]},${start[1]};${end[0]},${end[1]}`;
    const mat = await fetch(
      `https://api.mapbox.com/directions-matrix/v1/mapbox/driving-traffic/${coordString}?annotations=duration&access_token=${mapboxgl.accessToken}`
    ).then((r) => r.json());

    const minutes = Math.round(mat.durations[0][1] / 60);
    feature.properties.duration = minutes;

    map.getSource("routes").setData({
      type: "FeatureCollection",
      features: routesRef.current,
    });

    if (!map.getLayer("routes-duration-label")) {
      map.addLayer({
        id: "routes-duration-label",
        type: "symbol",
        source: "routes",
        layout: {
          "symbol-placement": "line",
          "text-field": ["concat", ["to-string", ["get", "duration"]], " min"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 12,
          "text-offset": [0, 0.5],
        },
        paint: { "text-color": "#000" },
      });
    }
  }

  return (
    <>
      <div className="sidebar">
        Longitude: {center[0].toFixed(4)} | Latitude: {center[1].toFixed(4)} |
        Zoom: {zoom.toFixed(2)}
      </div>
      <button
        className="route-button"
        onClick={() => {
          driversMap.forEach((driver) => {
            addMarker(driver[0], driver[1], "green");
          });
          passengersMap.forEach(([source, dest]) => {
            addMarker(source[0], source[1], "blue");
            addMarker(dest[0], dest[1], "black");
            getRoute([source[0], source[1]], [dest[0], dest[1]]);
          });
        }}
      >
        Draw Route/Time
      </button>
      <button className="reset-button" onClick={removeMarkers}>
        Reset
      </button>
      <button className="back-button" onClick={handleBack}>
        Back
      </button>
      <SendData />
      <div id="map-container" ref={mapContainerRef} />
    </>
  );
}
