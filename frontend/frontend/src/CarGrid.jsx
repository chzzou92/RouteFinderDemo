import { useState, useEffect, useRef } from "react";
import { assign } from "three/tsl";
import RightArrow from "./assets/rightArrow";
const CarGrid = ({
  count = 0,
  type = "Car",
  selectedItem,
  setSelectedItem,
  selectedLocation,
  setLocationsFilled,
}) => {
  const items = Array.from({ length: count }, (_, i) => `${type} ${i + 1}`);

  const locations = new Map();
  items.forEach((x) => {
    locations.set(x, "");
  });
  const lastAssignedLocationRef = useRef(null);
  const [locationMap, setLocationMap] = useState(locations);

  function shortenAddress(address) {
    if (!address || typeof address !== "string") return "";
    const parts = address.split(",").map((p) => p.trim());

    if (parts.length >= 3) {
      const name = parts[0];
      const words = name.split(" ");

      // Use full name if short, or first 3 words if longer
      const shortFirst = name.length <= 25 ? name : words.slice(0, 3).join(" ");

      return `${shortFirst}, ${parts[1]}, ${parts[2]}`;
    } else if (parts.length === 2) {
      return `${parts[0]}, ${parts[1]}`;
    } else {
      return address;
    }
  }

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
