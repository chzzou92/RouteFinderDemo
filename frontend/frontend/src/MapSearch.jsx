import React, { useEffect, useRef } from "react";

export default function MapSearch(props) {
  const widgetRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInstance = useRef(null);
  const widgetInitialized = useRef(false);

  useEffect(() => {
    const google = window.google;

    // Initialize Map
    const center = { lat: 37.7749, lng: -122.4194 }; // Default to San Francisco
    mapInstance.current = new google.maps.Map(mapRef.current, {
      center,
      zoom: 12,
    });

    // Add Marker
    markerRef.current = new google.maps.Marker({
      map: mapInstance.current,
      position: center,
    });

    // Initialize PlaceAutocomplete widget
    if (!widgetInitialized.current && widgetRef.current) {
      const pac = new google.maps.places.PlaceAutocompleteElement();
      pac.style.width = "100%";
      widgetRef.current.appendChild(pac);

      pac.addEventListener("gmp-select", async ({ placePrediction }) => {
        const place = placePrediction.toPlace();
        await place.fetchFields({ fields: ["location", "viewport"] });

        if (place.viewport) {
          mapInstance.current.fitBounds(place.viewport);
        } else {
          mapInstance.current.setCenter(place.location);
          mapInstance.current.setZoom(15);
        }

      //  console.log(place.Dg.location.lat);
      // console.log(place.Dg.location.lng);
      //  console.log(placePrediction.Oq.Nh[2].Nh[0]);
  
        props.loc(placePrediction.Oq.Nh[2].Nh[0]);
        props.cords([place.Dg.location.lat,place.Dg.location.lng]);
        markerRef.current.setPosition(place.location);
      });

      widgetInitialized.current = true;
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-xl font-bold">Search for a Place</h2>
      <div
        ref={widgetRef}
        className="p-2 border border-gray-300 rounded-md bg-white w-[600px]"
      />
      <div
        ref={mapRef}
        className="w-full max-w-4xl h-[300px] rounded-md shadow border border-gray-200"
      />
    </div>
  );
}
