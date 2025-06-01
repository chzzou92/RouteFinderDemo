import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import SendData from "./fetch";
import "mapbox-gl/dist/mapbox-gl.css";
import "./App.css";

const INITIAL_CENTER = [-74.4981, 40.4974];
const INITIAL_ZOOM = 10.65;
//https:api.mapbox.com/directions/v5/mapbox/cycling/-84.518641,39.134270;-84.512023,39.102779?geometries=geojson&access_token=pk.eyJ1IjoiY2h6b3UiLCJhIjoiY20zM2lvdHMzMWpnbjJqcTFzeGlrYThyaSJ9.5l4NrH55K5Y0_qRJ1VGtug
function App() {
  const mapRef = useRef();
  const mapContainerRef = useRef();

  const [center, setCenter] = useState(INITIAL_CENTER);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const routesRef = useRef([]);

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
  const addMarker = (lng, lat, color) => {
    new mapboxgl.Marker({ color: color })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);
  };

  useEffect(() => {
    mapboxgl.accessToken =
      "pk.eyJ1IjoiY2h6b3UiLCJhIjoiY20zM2lvdHMzMWpnbjJqcTFzeGlrYThyaSJ9.5l4NrH55K5Y0_qRJ1VGtug";
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: center,
      zoom: zoom,
    });

    // create a function to make a directions request and update the destination
    mapRef.current.on("move", () => {
      // get the current center coordinates and zoom level from the map
      const mapCenter = mapRef.current.getCenter();
      const mapZoom = mapRef.current.getZoom();

      // update state
      setCenter([mapCenter.lng, mapCenter.lat]);
      setZoom(mapZoom);
    });
    const map = mapRef.current;
    if (!map) return;

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

    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
        `${start[0]},${start[1]};${end[0]},${end[1]}` +
        `?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
    );
    const json = await res.json();
    console.log(res);
    const geom = json.routes[0].geometry; // { type: "LineString", coordinates: [...] }

    const feature = {
      type: "Feature",
      properties: {},
      geometry: geom,
    };
    // create the source & layer the first time
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
      routesRef.current = []; // reset or initialize
    }
    // store and redraw
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

    // 1) Draw the route and get back the Feature object you just pushed into routesRef.current
    const feature = await getRoute(start, end);
    if (!feature) return;

    // 2) Query the Matrix API for just that pair
    const coordString = `${start[0]},${start[1]};${end[0]},${end[1]}`;
    const mat = await fetch(
      `https://api.mapbox.com/directions-matrix/v1/` +
        `mapbox/driving-traffic/${coordString}` +
        `?annotations=duration&access_token=${mapboxgl.accessToken}`
    ).then((r) => r.json());

    // 3) Convert seconds → rounded minutes
    const minutes = Math.round(mat.durations[0][1] / 60);

    // 4) Inject the duration into that same feature object
    feature.properties.duration = minutes;

    // 5) Update the "routes" source with all features (including our newly‐labeled one)
    map.getSource("routes").setData({
      type: "FeatureCollection",
      features: routesRef.current,
    });

    // 6) If you haven’t already added a symbol layer for durations, add it now
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
        paint: {
          "text-color": "#000",
        },
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
          //getRoute([-74.4927, 40.4174], [-74.4981, 40.5081]);
          drivers.forEach((driver) => {
            addMarker(driver[0], driver[1], "green");
          });
          //getTime([-74.4368, 40.4396], [-74.6748, 40.453]);
          passengers.forEach(([source, dest]) => {
            addMarker(source[0], source[1], "blue");
            addMarker(dest[0], dest[1], "black");
            getRoute([source[0], source[1]], [dest[0], dest[1]]);
          });
        }}
      >
        Draw Route/Time
      </button>
      <button className="reset-button" onClick={handleButtonClick}>
        Reset
      </button>
      <SendData />
      <div id="map-container" ref={mapContainerRef} />
    </>
  );
}

export default App;
