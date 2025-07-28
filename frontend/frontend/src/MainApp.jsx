import { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import SendData from "./Fetch";
import "mapbox-gl/dist/mapbox-gl.css";
import "./App.css";
import { useNavigate } from "react-router-dom";
import createThreeCarLayer from "./ThreeCarLayer";
import createPassengerThreeLayer from "./createPassengerLayer";

const INITIAL_CENTER = [-74.4981, 40.4974];
const INITIAL_ZOOM = 12;

export default function MainApp() {
  const { state } = useLocation();
  const { passengersMap, driversMap } = state || {};
  const mapRef = useRef();
  const mapContainerRef = useRef();
  const [center, setCenter] = useState(INITIAL_CENTER);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const routesRef = useRef([]);
  const markersRef = useRef([]);
  const [fetchData, setFetchData] = useState(null);

  const passengerOrigin = [-74.436765, 40.439562];
  const carOrigin = [-74.4927, 40.4174];
  const modelAltitude = 2;
  const modelRotate = [Math.PI / 2, 0, 0];
  const boyOffset = { x: 0.000025, y: 0.00001, z: 0.0000004 };
  const girlOffset = { x: 0.000028, y: -0.00001, z: 0.0000004 };
  const manOffset = { x: 0.000005, y: 0.00001, z: 0.0000004 };
  const oldManOffset = { x: -0.000019, y: 0.00001, z: 0.0000004 };
  const oldWomanOffset = { x: -0.000018, y: -0.00001, z: 0.0000004 };
  const WomanOffset = { x: 0.00001, y: -0.00001, z: 0.0000004 };
  const carAnimateRef = useRef(null);
  const [finalDriverPath, setFinalDriverPath] = useState(null);
  const models = [
    { offset: boyOffset, path: "/People/Boy/boy.gltf" },
    { offset: manOffset, path: "/People/Man/man.gltf" },
    { offset: oldManOffset, path: "/People/OldMan/OldMan.gltf" },
    { offset: girlOffset, path: "/People/Girl/girl.gltf" },
    { offset: oldWomanOffset, path: "/People/OldWoman/OldWoman.gltf" },
    { offset: WomanOffset, path: "/People/Woman/Woman.gltf" },
  ];
  function createModel(map, cords, offset, path) {
    const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
      cords,
      modelAltitude
    );

    const modelTransform = {
      translateX: modelAsMercatorCoordinate.x + (offset?.x ?? 0),
      translateY: modelAsMercatorCoordinate.y - (offset?.y ?? 0),
      translateZ: modelAsMercatorCoordinate.z - (offset?.z ?? 0),
      rotateX: modelRotate[0],
      rotateY: modelRotate[1],
      rotateZ: modelRotate[2],
      scale:
        modelAsMercatorCoordinate.meterInMercatorCoordinateUnits() *
        Math.pow(1.17, 22.0 - zoom),
    };

    const newThreeLayer = createPassengerThreeLayer(map, modelTransform, path);
    map.addLayer(newThreeLayer);
  }

  const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
    carOrigin,
    modelAltitude
  );
  const modelTransform = {
    translateX: modelAsMercatorCoordinate.x,
    translateY: modelAsMercatorCoordinate.y,
    translateZ: modelAsMercatorCoordinate.z,
    rotateX: modelRotate[0],
    rotateY: modelRotate[1],
    rotateZ: modelRotate[2],
    scale:
      modelAsMercatorCoordinate.meterInMercatorCoordinateUnits() *
      Math.pow(1.8, 22.0 - zoom),
  };

  const drivers = [[40.4174, -74.4927]];
  const passengers = [
    [
      [40.439562, -74.436765],
      [40.452963, -74.674849],
    ],
    [
      [40.525454, -74.43755],
      [40.563496, -74.31936],
    ],
    [
      [40.56596, -74.48454],
      [40.555897, -74.611447],
    ],
    // [
    //   [40.480098, -74.434529],
    //   [40.343104, -74.41297],
    // ],
    // [
    //   [40.482294, -74.44878],
    //   [40.340292, -74.570587],
    // ],
    // [
    //   [40.592058, -74.449443],
    //   [40.694155, -74.375534],
    // ],
    // [
    //   [40.484038, -74.452944],
    //   [40.461627, -74.267957],
    // ],
    // [
    //   [40.485142, -74.53506],
    //   [40.615775, -74.469859],
    // ],
    // [
    //   [40.47876, -74.37787],
    //   [40.570663, -74.29261],
    // ],
    // [
    //   [40.487974, -74.462616],
    //   [40.407822, -74.581453],
    // ],
  ];

  // const logMaps = () => {
  //   console.log("=== Drivers Map ===");
  //   driversMap.forEach((cords, index) => {
  //     if (cords) {
  //       console.log(`Driver ${index}: [${cords[0]}, ${cords[1]}]`);
  //     } else {
  //       console.log(`Driver ${index}: Not set`);
  //     }
  //   });

  //   console.log("=== Passengers Map ===");
  //   passengersMap.forEach((pair, index) => {
  //     const [pickup, dropoff] = pair;
  //     const pickupStr = pickup ? `[${pickup[0]}, ${pickup[1]}]` : "Not set";
  //     const dropoffStr = dropoff ? `[${dropoff[0]}, ${dropoff[1]}]` : "Not set";
  //     console.log(
  //       `Passenger ${index}:\n  Pickup: ${pickupStr}\n  Dropoff: ${dropoffStr}`
  //     );
  //   });
  // };

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
    map.getSource("route-points").setData({
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
    // logMaps();

    mapboxgl.accessToken = MAPBOX_API_KEY;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      center,
      zoom,
      pitch: 60,
      antialias: true,
    });

    map.on("move", () => {
      const mapCenter = mapRef.current.getCenter();
      setCenter([mapCenter.lng, mapCenter.lat]);
      setZoom(mapRef.current.getZoom());
      modelTransform.scale =
        modelAsMercatorCoordinate.meterInMercatorCoordinateUnits() *
        Math.pow(1.8, 22.0 - mapRef.current.getZoom());
      map.triggerRepaint();
    });
    map.on("style.load", () => {
      const { layer: driverThreeLayer, animateCar } = createThreeCarLayer(
        map,
        modelTransform
      );
      map.addLayer(driverThreeLayer);
      carAnimateRef.current = animateCar;
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (
      finalDriverPath &&
      finalDriverPath.length > 0 &&
      carAnimateRef.current
    ) {
      const tempPath = [
        [-74.4927, 40.4174],
        [-74.436765, 40.439562],
      ];
      carAnimateRef.current(finalDriverPath);
    }
  }, [finalDriverPath]);

  const handleButtonClick = () => {
    mapRef.current.flyTo({
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    });
  };

  async function getFinishedRoute(coordsList) {
    const map = mapRef.current;
    if (!map || !coordsList || coordsList.length < 2) return null;

    console.log("Requesting route for coordinates:", coordsList);

    // Format coordinates as 'lng,lat;lng,lat;...' string for Mapbox API
    const coordString = coordsList
      .map((coord) => `${coord[0]},${coord[1]}`)
      .join(";");

    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
        `${coordString}` +
        `?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
    );
    const json = await res.json();

    if (!json.routes || json.routes.length === 0) {
      console.error("No routes found");
      return null;
    }

    const geom = json.routes[0].geometry;

    //set path for driver
    setFinalDriverPath(geom.coordinates);
    const feature = {
      type: "Feature",
      properties: {},
      geometry: geom,
    };

    // Initialize the route line source and layer if not present
    if (!map.getSource("finished-route")) {
      map.addSource("finished-route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "finished-route-line",
        type: "line",
        source: "finished-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ca8bcc", "line-width": 3 },
      });
      routesRef.current = [];
    }

    routesRef.current.push(feature);
    map.getSource("finished-route").setData({
      type: "FeatureCollection",
      features: routesRef.current,
    });
    // coordsList.forEach((coord) => {
    //   const marker = new mapboxgl.Marker({ color: "purple" })
    //     .setLngLat(coord)
    //     .addTo(map);
    //   markersRef.current.push(marker);
    // });

    // Create numbered point features for labels
    const pointFeatures = coordsList.map((coord, index) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: coord,
      },
      properties: {
        order: String(index + 1), // numbering labels as strings
      },
    }));

    // Initialize or update the source and layer for the labels
    if (!map.getSource("route-points")) {
      map.addSource("route-points", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: pointFeatures,
        },
      });

      map.addLayer({
        id: "route-points-labels",
        type: "symbol",
        source: "route-points",
        layout: {
          "text-field": ["get", "order"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 14,
          "text-offset": [0, -2], // raise number above the point
          "text-anchor": "bottom",
        },
        paint: {
          "text-color": "#0000ff",
        },
      });
    } else {
      map.getSource("route-points").setData({
        type: "FeatureCollection",
        features: pointFeatures,
      });
    }

    return feature;
  }

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

    if (!map.getSource("passenger-route")) {
      map.addSource("passenger-route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "passenger-route-line",
        type: "line",
        source: "passenger-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#3887be", "line-width": 4 },
      });
      routesRef.current = [];
    }

    routesRef.current.push(feature);
    map.getSource("passenger-route").setData({
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

    map.getSource("passenger-route").setData({
      type: "FeatureCollection",
      features: routesRef.current,
    });

    if (!map.getLayer("routes-duration-label")) {
      map.addLayer({
        id: "routes-duration-label",
        type: "symbol",
        source: "passenger-route",
        layout: {
          "symbol-placement": "point",
          "text-field": ["concat", ["to-string", ["get", "duration"]], " min"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 13,
          "text-offset": [0, 0.5],
          "text-keep-upright": true,
          "text-max-angle": 45,
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
          drivers.forEach((driver) => {
            addMarker(driver[1], driver[0], "green");
          });
          passengers.forEach(([source, dest], index) => {
            const lngLat = [source[1], source[0]];
            const model = models[index % models.length];
            createModel(mapRef.current, lngLat, model.offset, model.path);
            getTime([source[1], source[0]], [dest[1], dest[0]]);
            addMarker(dest[1], dest[0], "black");
            getRoute([source[1], source[0]], [dest[1], dest[0]]);
          });
        }}
      >
        Draw Initial Route
      </button>
      <button
        className="reset-button"
        onClick={() => {
          removeMarkers();
          console.log(fetchData);
        }}
      >
        Reset
      </button>
      <button className="back-button" onClick={handleBack}>
        Back
      </button>
      <SendData
        setFetchData={setFetchData}
        drivers={drivers}
        passengers={passengers}
      />
      <button
        className="create-button"
        onClick={() => {
          console.log(fetchData.path);
          getFinishedRoute(fetchData.path);
        }}
      >
        Create Route
      </button>
      <div id="map-container" ref={mapContainerRef} />
    </>
  );
}
