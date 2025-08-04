import { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import SendData from "./fetch";
import "mapbox-gl/dist/mapbox-gl.css";
import "./App.css";
import { useNavigate } from "react-router-dom";
import createThreeCarLayer from "./ThreeCarLayer";
import createPassengerThreeLayer from "./createPassengerLayer";

const INITIAL_CENTER = [-74.4981, 40.4974];
const INITIAL_ZOOM = 12;

export default function MainApp() {
  const { state } = useLocation();
  const { passengersMap, driversMap, numDrivers, numPassengers } = state || {};
  const mapRef = useRef();
  const mapContainerRef = useRef();
  const [center, setCenter] = useState(INITIAL_CENTER);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const routesRef = useRef([]);
  const markersRef = useRef([]);
  const [loadComplete, setLoadComplete] = useState(false);
  const carModelRef = useRef(null);

  const passengerTransforms = [];
  const carOrigin = driversMap
    ? [driversMap[0][1], driversMap[0][0]]
    : [-74.4927, 40.4174];
  const modelAltitude = 2;
  const modelRotate = [Math.PI / 2, 0, 0];
  const boyOffset = { x: 0.000025, y: 0.00001, z: 0.0000004 };
  const girlOffset = { x: 0.000028, y: -0.00001, z: 0.0000004 };
  const manOffset = { x: 0.000005, y: 0.00001, z: 0.0000004 };
  const oldManOffset = { x: -0.000019, y: 0.00001, z: 0.0000004 };
  const oldWomanOffset = { x: -0.000018, y: -0.00001, z: 0.0000004 };
  const WomanOffset = { x: 0.00001, y: -0.00001, z: 0.0000004 };
  const assignPathToCarRef = useRef(null);
  const [finalDriverPaths, setFinalDriverPaths] = useState(null);
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

    const scaleBase =
      modelAsMercatorCoordinate.meterInMercatorCoordinateUnits();

    const modelTransform = {
      translateX: modelAsMercatorCoordinate.x + (offset?.x ?? 0),
      translateY: modelAsMercatorCoordinate.y - (offset?.y ?? 0),
      translateZ: modelAsMercatorCoordinate.z - (offset?.z ?? 0),
      rotateX: modelRotate[0],
      rotateY: modelRotate[1],
      rotateZ: modelRotate[2],
      scale: scaleBase * Math.pow(1.2, 22.0 - zoom),
      scaleBase,
    };

    passengerTransforms.push(modelTransform);

    const newThreeLayer = createPassengerThreeLayer(map, modelTransform, path);
    map.addLayer(newThreeLayer);
  }

  function createCarModelTransforms(
    lngLatList,
    modelAltitude = 2,
    modelRotate = [Math.PI / 2, 0, 0]
  ) {
    return lngLatList.map(([lng, lat]) => {
      const mercatorCoord = mapboxgl.MercatorCoordinate.fromLngLat(
        [lng, lat],
        modelAltitude
      );
      const scaleBase = mercatorCoord.meterInMercatorCoordinateUnits();
      return {
        translateX: mercatorCoord.x,
        translateY: mercatorCoord.y,
        translateZ: mercatorCoord.z,
        rotateX: modelRotate[0],
        rotateY: modelRotate[1],
        rotateZ: modelRotate[2],
        scale:
          mercatorCoord.meterInMercatorCoordinateUnits() *
          Math.pow(1.8, 23.0 - zoom),
        scaleBase,
      };
    });
  }

  const defaultDrivers = [
    [40.4174, -74.4927],
    [40.47876, -74.37787],
    [40.487974, -74.462616],
    [40.615775, -74.469859],
  ];

  const carTransforms = createCarModelTransforms(
    driversMap
      ? driversMap.map(([lat, lng]) => [lng, lat])
      : defaultDrivers.map(([lat, lng]) => [lng, lat])
  );

  const defaultPassengers = [
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
    [
      [40.480098, -74.434529],
      [40.343104, -74.41297],
    ],
    [
      [40.482294, -74.44878],
      [40.340292, -74.570587],
    ],
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
    navigate("/route", {
      state: {
        drivers: driversMap ? numDrivers : defaultDrivers.length,
        passengers: passengersMap ? numPassengers : defaultPassengers.length,
        driversMap: driversMap ? driversMap : defaultDrivers,
        passengersMap: passengersMap ? passengersMap : defaultPassengers,
      },
    });
  };

  const resetPaths = () => {
    // markersRef.current.forEach((marker) => marker.remove());
    // markersRef.current = [];
    routesRef.current = [];

    const map = mapRef.current;
    if (!map) return;
    //clears paths
    const clearSource = (sourceId) => {
      const source = map.getSource(sourceId);
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: [],
        });
      } else {
        console.warn(`Source "${sourceId}" not found`);
      }
    };

    clearSource("routes");
    clearSource("route-points");
    clearSource("finished-route");
    clearSource("passsenger-route");
  };

  // const resetCar = () => {
  //   //resets car position to original position
  //   const car = carModelRef.current?.current;
  //   if (car && finalDriverPath?.length > 0) {
  //     const merc = mapboxgl.MercatorCoordinate.fromLngLat(
  //       { lng: carOrigin[0], lat: carOrigin[1] },
  //       2
  //     );
  //     car.position.set(merc.x, merc.y, merc.z);
  //     modelTransform.translateX = merc.x;
  //     modelTransform.translateY = merc.y;
  //     modelTransform.translateZ = merc.z;
  //   }
  // };
  const resetMapPosition = () => {
    mapRef.current.flyTo({
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
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

    const initialCenter = driversMap
      ? [driversMap[0][1], driversMap[0][0]]
      : INITIAL_CENTER;
    mapboxgl.accessToken = MAPBOX_API_KEY;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: initialCenter,
      zoom,
      pitch: 60,
      antialias: true,
    });

    map.on("move", () => {
      const mapCenter = mapRef.current.getCenter();
      setCenter([mapCenter.lng, mapCenter.lat]);
      setZoom(mapRef.current.getZoom());
      carTransforms.forEach((t) => {
        t.scale = t.scaleBase * Math.pow(1.8, 22.5 - mapRef.current.getZoom());
      });
      passengerTransforms.forEach((t) => {
        t.scale = t.scaleBase * Math.pow(1.2, 22.0 - mapRef.current.getZoom());
      });

      map.triggerRepaint();
    });
    map.on("style.load", () => {
      const { layer: driverThreeLayer, assignPathToCar } = createThreeCarLayer(
        map,
        carTransforms
      );
      map.addLayer(driverThreeLayer);
      assignPathToCarRef.current = assignPathToCar;
      setLoadComplete(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (loadComplete) {
      if (driversMap && passengersMap) {
        loadPassengers(driversMap, passengersMap);
      } else {
        loadPassengers(defaultDrivers, defaultPassengers);
      }
    }
  }, [loadComplete]);

  useEffect(() => {
    if (
      finalDriverPaths &&
      finalDriverPaths.length > 0 &&
      assignPathToCarRef.current
    ) {
      finalDriverPaths.forEach((path, index) => {
        assignPathToCarRef.current(index, path);
      });
    }
  }, [finalDriverPaths]);

  const loadPassengers = (d, p) => {
    // d.forEach((driver) => {
    //   addMarker(driver[1], driver[0], "green");
    // });
    p.forEach(([source, dest], index) => {
      const lngLat = [source[1], source[0]];
      const model = models[index % models.length];
      createModel(mapRef.current, lngLat, model.offset, model.path);
      getTime([source[1], source[0]], [dest[1], dest[0]]);
      addMarker(dest[1], dest[0], "black");
      getRoute([source[1], source[0]], [dest[1], dest[0]]);
    });
  };

  async function drawMultipleRoutes(listOfCoordLists) {
    const map = mapRef.current;
    if (!map) return;
    // add driver origin markers:
    listOfCoordLists.forEach((coordList) => {
      addMarker(coordList[0][0], coordList[0][1], "green");
    });
    // 1) Initialize sources & layers once
    if (!map.getSource("finished-route")) {
      map.addSource("finished-route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      const innerColors = [
        "#fbb4ae",
        "#b3cde3",
        "#ccebc5",
        "#decbe4",
        "#fed9a6",
      ];
      const outerColors = [
        "#f768a1",
        "#80b1d3",
        "#a6d854",
        "#b9e2d8",
        "#fdb462",
      ];
      const coreColors = [
        "#ae017e",
        "#016c59",
        "#1b7837",
        "#542788",
        "#d95f02",
      ];

      // Helper to build a match expression
      const makeMatch = (colors) => {
        const expr = ["match", ["get", "routeIndex"]];
        colors.forEach((c, i) => {
          expr.push(i, c);
        });
        expr.push(colors[0]); // fallback
        return expr;
      };

      // Inner glow
      map.addLayer({
        id: "finished-route-inner",
        type: "line",
        source: "finished-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": makeMatch(innerColors),
          "line-width": 14,
          "line-opacity": 0.2,
        },
      });

      // Outer glow
      map.addLayer({
        id: "finished-route-outer",
        type: "line",
        source: "finished-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": makeMatch(outerColors),
          "line-width": 8,
          "line-opacity": 0.5,
        },
      });

      // Core line
      map.addLayer({
        id: "finished-route-core",
        type: "line",
        source: "finished-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": makeMatch(coreColors),
          "line-width": 4,
          "line-opacity": 1,
        },
      });

      // Points labels (reuse earlier match for color too if desired)
      map.addSource("route-points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "route-points-labels",
        type: "symbol",
        source: "route-points",
        layout: {
          "text-field": ["get", "order"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 14,
          "text-offset": [0, -2],
          "text-anchor": "bottom",
        },
        paint: {
          "text-color": makeMatch(coreColors),
        },
      });

      routesRef.current = [];
    }

    // 2) Fetch all routes in parallel
    const routes = await Promise.all(
      listOfCoordLists.map(async (coordsList, index) => {
        const coordString = coordsList.map((c) => `${c[0]},${c[1]}`).join(";");
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
            coordString +
            `?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
        );
        const json = await res.json();
        if (!json.routes?.length) return null;

        return {
          type: "Feature",
          properties: {
            routeIndex: index,
          },
          geometry: json.routes[0].geometry,
        };
      })
    );

    const validRoutes = routes
      .filter(Boolean)
      .map((feature) => feature.geometry.coordinates);

    setFinalDriverPaths(validRoutes);

    // 3) Update the line source
    routesRef.current = routes.filter((f) => f);
    map.getSource("finished-route").setData({
      type: "FeatureCollection",
      features: routesRef.current,
    });

    // 4) Build and update point features with routeIndex
    const pointFeatures = [];
    listOfCoordLists.forEach((coordsList, routeIndex) => {
      coordsList.forEach((coord, idx) => {
        pointFeatures.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: coord },
          properties: {
            order: String(idx + 1),
            routeIndex,
          },
        });
      });
    });
    map.getSource("route-points").setData({
      type: "FeatureCollection",
      features: pointFeatures,
    });

    return routesRef.current;
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
      {/* <button
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
      </button> */}
      <button
        className="reset-button"
        onClick={() => {
          resetPaths();
          resetMapPosition();
          //  resetCar();
        }}
      >
        Reset
      </button>
      <button className="back-button" onClick={handleBack}>
        Back
      </button>
      <SendData
        drivers={driversMap ? driversMap : defaultDrivers}
        passengers={passengersMap ? passengersMap : defaultPassengers}
        drawMultipleRoutes={drawMultipleRoutes}
      />
      <div id="map-container" ref={mapContainerRef} />
    </>
  );
}
