import { useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import CarGrid from "./CarGrid";
import MapSearch from "./MapSearch";
import { useNavigate } from "react-router-dom";
export default function GetRoute() {
  const { state } = useLocation();
  const { drivers, passengers } = state || {};
  const [selectedItem, setSelectedItem] = useState(null);
  const navigate = useNavigate();
  const [location, getLocation] = useState(null);
  const [locationsFilled, setLocationsFilled] = useState(0);
  const [locationsError, setLocationsError] = useState(false);
  const [selectedCords, setSelectedCords] = useState([]);
  const capacity = drivers + passengers * 2;
  let driversMapRef = useRef(Array.from({ length: drivers }, () => null));
  let passengersMapRef = useRef(
    Array.from({ length: passengers }, () => [null, null])
  );

  const addCord = (item, cords) => {
    const parts = item.split("-");
    const type = parts[0];
    const index = parseInt(parts[1], 10);
    const role = parts[2];
    if (type === "Passenger") {
      if (role === "pickup") {
        passengersMapRef.current[index][0] = cords;
      } else {
        passengersMapRef.current[index][1] = cords;
      }
    }
    if (type === "Driver") {
      driversMapRef.current[index] = cords;
    }
    const logMaps = () => {
      console.log("=== Drivers Map ===");
      driversMapRef.current.forEach((cords, index) => {
        if (cords) {
          console.log(`Driver ${index}: [${cords[0]}, ${cords[1]}]`);
        } else {
          console.log(`Driver ${index}: Not set`);
        }
      });

      console.log("=== Passengers Map ===");
      passengersMapRef.current.forEach((pair, index) => {
        const [pickup, dropoff] = pair;
        const pickupStr = pickup ? `[${pickup[0]}, ${pickup[1]}]` : "Not set";
        const dropoffStr = dropoff
          ? `[${dropoff[0]}, ${dropoff[1]}]`
          : "Not set";
        console.log(
          `Passenger ${index}:\n  Pickup: ${pickupStr}\n  Dropoff: ${dropoffStr}`
        );
      });
    };
  };
  useEffect(() => {
    if (typeof selectedItem === "string" && Array.isArray(selectedCords)) {
      addCord(selectedItem, selectedCords);
    }
  }, [selectedCords]);

  const handleBack = () => {
    navigate("/");
  };
  const handleNext = () => {
    if (locationsFilled === capacity) {
      navigate("/app", {
        state: {
          passengersMap: passengersMapRef.current,
          driversMap: driversMapRef.current,
        },
      });
    } else {
      setLocationsError(true);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center space-y-4">
      <h1 className="text-3xl font-bold">Info: </h1>
      <MapSearch loc={getLocation} cords={setSelectedCords} />
      <div className="flex flex-row justify-center items-center space-x-12">
        <CarGrid
          count={passengers}
          type="Passenger"
          selectedLocation={location}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          setLocationsFilled={setLocationsFilled}
          cap={capacity}
        />
        <CarGrid
          count={drivers}
          type="Driver"
          selectedLocation={location}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          setLocationsFilled={setLocationsFilled}
          cap={capacity}
        />
      </div>
      <div className="flex flex-col justify-center items-center space-y-4">
        <div className="flex flex-row justify-center items-center space-x-12">
          <button onClick={handleBack}>Back</button>
          <button onClick={handleNext}>Next</button>
        </div>
        {locationsError && (
          <div className="text-red-600 bg-red-100 border border-red-400 p-2 rounded-md mt-2">
            🚫 Missing Locations!
          </div>
        )}
      </div>
    </div>
  );
}
