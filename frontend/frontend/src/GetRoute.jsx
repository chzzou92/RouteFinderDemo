import { useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import CarGrid from "./CarGrid";
import MapSearch from "./MapSearch";
import { useNavigate } from "react-router-dom";
import ButtonGrid from "./ButtonGrid";
import { AnimatePresence, motion } from "framer-motion";
import ErrorCard from "./ErrorCard";
import { shortenAddress } from "./shortenAddress";
export default function GetRoute() {
  const { state } = useLocation();
  const { drivers, passengers, driversMap, passengersMap } = state || {};
  const [selectedItem, setSelectedItem] = useState("Passenger-0-pickup");
  const navigate = useNavigate();
  const [location, getLocation] = useState(null);
  const [locationsFilled, setLocationsFilled] = useState(0);
  const [locationsError, setLocationsError] = useState(false);
  const [selectedCords, setSelectedCords] = useState([]);
  const [driverAddressMap, setDriverAddressMap] = useState(new Map());
  const [passengerAddressMap, setPassengerAddressMap] = useState(new Map());

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
  };
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
      const dropoffStr = dropoff ? `[${dropoff[0]}, ${dropoff[1]}]` : "Not set";
      console.log(
        `Passenger ${index}:\n  Pickup: ${pickupStr}\n  Dropoff: ${dropoffStr}`
      );
    });
  };
  useEffect(() => {
    if (typeof selectedItem === "string" && Array.isArray(selectedCords)) {
      addCord(selectedItem, selectedCords);
    }
  }, [selectedCords]);
  useEffect(() => {
    console.log(driversMapRef.current);
    console.log(passengersMapRef.current);
  });
  useEffect(() => {
    async function populateFromPassedMaps() {
      let filled = 0;

      const newDriverMap = new Map();
      const newPassengerMap = new Map();

      // For drivers
      for (let i = 0; i < driversMap.length; i++) {
        const cords = driversMap[i];
        if (cords?.length === 2) {
          try {
            const address = await getAddressFromCoords(cords[0], cords[1]);
            newDriverMap.set(`Driver-${i}-pickup`, shortenAddress(address));
            driversMapRef.current[i] = cords;
          } catch (e) {
            console.error("Driver address fetch failed", e);
          }
        }
      }

      // For passengers
      for (let i = 0; i < passengersMap.length; i++) {
        const [pickup, dropoff] = passengersMap[i] || [];

        if (pickup?.length === 2) {
          try {
            const address = await getAddressFromCoords(pickup[0], pickup[1]);
            newPassengerMap.set(
              `Passenger-${i}-pickup`,
              shortenAddress(address)
            );
            if (!passengersMapRef.current[i]) passengersMapRef.current[i] = [];
            passengersMapRef.current[i][0] = pickup;
          } catch (e) {
            console.error("Pickup address fetch failed", e);
          }
        }

        if (dropoff?.length === 2) {
          try {
            const address = await getAddressFromCoords(dropoff[0], dropoff[1]);
            newPassengerMap.set(`Passenger-${i}-dropoff`, address);
            if (!passengersMapRef.current[i]) passengersMapRef.current[i] = [];
            passengersMapRef.current[i][1] = dropoff;
          } catch (e) {
            console.error("Dropoff address fetch failed", e);
          }
        }
      }
      setLocationsFilled(capacity + 1);
      setPassengerAddressMap(newPassengerMap);
      setDriverAddressMap(newDriverMap);
    }
    populateFromPassedMaps();
  }, []);

  const handleBack = () => {
    navigate("/");
  };
  const handleNext = () => {
    if (locationsFilled >= capacity) {
      navigate("/app", {
        state: {
          passengersMap: passengersMapRef.current,
          driversMap: driversMapRef.current,
          numDrivers: drivers,
          numPassengers: passengers,
        },
      });
    } else {
      console.log(capacity);
      console.log(locationsFilled);
      logMaps();
      setLocationsError(true);
    }
  };
  const buttonConfig1 = [
    {
      className: "button3",
      text: "NEXT",
      onClick: handleNext,
    },
  ];
  const buttonConfig2 = [
    {
      className: "button4",
      text: "BACK",
      onClick: handleBack,
    },
  ];
  async function getAddressFromCoords(lat, lng) {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
    );

    const data = await res.json();
    if (data.status === "OK") {
      return data.results[0].formatted_address;
    } else {
      throw new Error("Geocoding failed: " + data.status);
    }
  }

  return (
    <div className="bg-container h-full w-full overflow-y-auto flex flex-col justify-center items-center space-y-4">
      <div className="flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold">Info: </h1>
        <MapSearch loc={getLocation} cords={setSelectedCords} />
      </div>
      <div className="flex flex-row justify-center items-center space-x-12">
        <CarGrid
          count={passengers}
          type="Passenger"
          selectedLocation={location}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          setLocationsFilled={setLocationsFilled}
          cap={capacity}
          initialLocationsMap={new Map()}
          prefillLocationMap={passengerAddressMap}
        />
        <CarGrid
          count={drivers}
          type="Driver"
          selectedLocation={location}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          setLocationsFilled={setLocationsFilled}
          cap={capacity}
          initialLocationsMap={new Map()}
          prefillLocationMap={driverAddressMap}
        />
      </div>
      <div className="flex flex-col justify-center items-center space-y-4">
        <div className="flex flex-row justify-center items-center space-x-12 p-4">
          <ButtonGrid buttons={buttonConfig2} />
          <ButtonGrid buttons={buttonConfig1} />
        </div>
        <div className="h-20">
          <AnimatePresence>
            {locationsError && (
              <motion.div
                key={locationsError}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ position: "relative" }}
              >
                <ErrorCard type="missing-locations" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
