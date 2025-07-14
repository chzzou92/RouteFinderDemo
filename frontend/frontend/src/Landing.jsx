import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Car1Scene from "./Car1Scene";
import { pass } from "three/tsl";
import Car2Scene from "./Car2Scene";

export default function Landing() {
  const navigate = useNavigate();
  const [passengerError, setPassengerError] = useState(0);
  const [drivers, setDrivers] = useState(1);
  const [driversError, setDriversError] = useState(0);
  const [passengers, setPassengers] = useState(1);
  const handleClick = () => {
    navigate("/route", {
      state: { passengers, drivers },
    });
  };
  const addPassengers = () => {
    if (passengers < 10) {
      setPassengers(passengers + 1);
      setPassengerError(0);
    } else {
      setPassengerError(1);
    }
  };
  const subPassengers = () => {
    if (passengers > 1) {
      setPassengers(passengers - 1);
      setPassengerError(0);
    } else {
      setPassengerError(2);
    }
  };
  const addDrivers = () => {
    if (drivers < 10) {
      setDrivers(drivers + 1);
      setDriversError(0);
    } else {
      setDriversError(1);
    }
  };
  const subDrivers = () => {
    if (drivers > 1) {
      setDrivers(drivers - 1);
      setDriversError(0);
    } else {
      setDriversError(2);
    }
  };
  return (
    <div>
      <div className="flex flex-col items-center justify-center space-y-4">
        <h1 className="text-3xl font-bold center">Welcome to RouteFinder!</h1>
        <h3 className="text-2xl font-bold">
          To Use the App, first select the amount of Passengers and Drivers you
          would like!
        </h3>
        <button onClick={handleClick}>Next</button>
      </div>
      <div className="flex flex-row items-center justify-center">
        <Car1Scene />
        <Car2Scene />
      </div>
      <div className="flex flex-row items-center justify-around">
        <div className="flex flex-col items-center justify-center space-y-4">
          <h3 className="text-2xl font-bold">
            {passengers} {passengers == 1 ? "Passenger" : "Passengers"}
          </h3>
          <div className="flex flex-row items-center justify-center space-x-4">
            <button onClick={addPassengers}>+</button>
            <button onClick={subPassengers}>-</button>
          </div>
          {passengerError == 1 && (
            <div className="text-red-600 bg-red-100 border border-red-400 p-2 rounded-md mt-2">
              🚫 You've reached the maximum number of passengers!
            </div>
          )}
          {passengerError == 2 && (
            <div className="text-red-600 bg-red-100 border border-red-400 p-2 rounded-md mt-2">
              🚫 Too little passengers!
            </div>
          )}
        </div>
        <div className="flex flex-col items-center justify-center space-y-4">
          <h3 className="text-2xl font-bold">
            {drivers} {drivers == 1 ? "Driver" : "Drivers"}
          </h3>
          <div className="flex flex-row items-center justify-center space-x-4">
            <button onClick={addDrivers}>+</button>
            <button onClick={subDrivers}>-</button>
          </div>
          {driversError == 1 && (
            <div className="text-red-600 bg-red-100 border border-red-400 p-2 rounded-md mt-2">
              🚫 You've reached the maximum number of drivers!
            </div>
          )}
          {driversError == 2 && (
            <div className="text-red-600 bg-red-100 border border-red-400 p-2 rounded-md mt-2">
              🚫 Too little drivers!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
