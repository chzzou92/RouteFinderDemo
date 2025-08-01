import { useState, useEffect, useRef } from "react";
import { assign } from "three/tsl";
import RightArrow from "./assets/rightArrow";
import { shortenAddress } from "./shortenAddress";
const CarGrid = ({
  count = 0,
  type = "Car",
  selectedItem,
  setSelectedItem,
  selectedLocation,
  setLocationsFilled,
  initialLocationsMap = new Map(),
  prefillLocationMap = null,
}) => {
  const items = Array.from({ length: count }, (_, i) => `${type} ${i + 1}`);

  const initialMap = new Map();
  for (let i = 0; i < count; i++) {
    const pickupKey = `${type}-${i}-pickup`;
    const dropOffKey = `${type}-${i}-dropoff`;

    initialMap.set(pickupKey, initialLocationsMap.get(pickupKey) || "");

    if (type === "Passenger") {
      initialMap.set(dropOffKey, initialLocationsMap.get(dropOffKey) || "");
    }
  }
  const [locationMap, setLocationMap] = useState(initialMap);

  const lastAssignedLocationRef = useRef(null);

  useEffect(() => {
    if (
      selectedItem &&
      selectedLocation &&
      selectedLocation != lastAssignedLocationRef.current
    ) {
      updateLocation(selectedItem, selectedLocation);

      setLocationsFilled((prev) => {
        return prev + 0.5;
      });

      lastAssignedLocationRef.current = selectedLocation;
    }
  }, [selectedItem, selectedLocation]);

  useEffect(() => {
    if (prefillLocationMap && prefillLocationMap.size > 0) {
      setLocationMap(new Map(prefillLocationMap));
    }
  }, [prefillLocationMap]);

  const updateLocation = (key, newLocation) => {
    setLocationMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(key, newLocation);
      return newMap;
    });
  };

  return (
    <div className="p-4 space-y-2 w-fit">
      {items.map((item, index) => {
        const pickupKey = `${type}-${index}-pickup`;
        const dropOffKey = `${type}-${index}-dropoff`;
        return (
          <div
            key={pickupKey}
            className={`grid ${
              type === "Passenger" ? "grid-cols-4" : "grid-cols-2"
            } gap-4 items-center bg-gray-100 rounded-md p-4 shadow w-fit`}
          >
            <div className="text-lg font-semibold text-gray-800">{item}</div>
            <div
              className={`bg-white h-10 w-48 rounded-md border-2 ${
                selectedItem === pickupKey
                  ? "border-blue-500"
                  : "hover:border-gray-700 border-gray-300"
              }`}
              key={pickupKey}
              onClick={() => {
                setSelectedItem(pickupKey);
              }}
            >
              <h2 className="font-bold text-black text-base text-sm">
                {shortenAddress(locationMap.get(pickupKey))}
              </h2>
            </div>
            {type === "Passenger" ? (
              <RightArrow className="text-black" />
            ) : null}

            {type === "Passenger" ? (
              <div
                className={`bg-white h-10 w-48 rounded-md border-2 ${
                  selectedItem === dropOffKey
                    ? "border-blue-500"
                    : "hover:border-gray-700 border-gray-300"
                }`}
                key={dropOffKey}
                onClick={() => {
                  setSelectedItem(dropOffKey);
                }}
              >
                <h2 className="font-bold text-black text-sm">
                  {shortenAddress(locationMap.get(dropOffKey))}
                </h2>{" "}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
export default CarGrid;
