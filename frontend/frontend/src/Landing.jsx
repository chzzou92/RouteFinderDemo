import React from "react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Car1Scene from "./Car1Scene";
import { pass } from "three/tsl";
import PassengerScene from "./PassengerScene";
import ButtonGrid from "./ButtonGrid";
import ErrorCard from "./ErrorCard";
import { AnimatePresence, motion } from "framer-motion";

import "./Landing.css";
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
  const handleSkip = () => {
    setPassengers(-1);
    setDrivers(-1);
    navigate("/app", {
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

  const buttonConfig1 = [
    {
      className: "button1",
      svgPath: "M200-440v-80h560v80H200Z",
      onClick: subPassengers,
    },
    {
      className: "button2",
      svgPath: "M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z",
      onClick: addPassengers,
    },
  ];

  const buttonConfig2 = [
    {
      className: "button1",
      svgPath: "M200-440v-80h560v80H200Z",
      onClick: subDrivers,
    },
    {
      className: "button2",
      svgPath: "M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z",
      onClick: addDrivers,
    },
  ];
  const buttonConfig4 = [
    {
      className: "button3",
      text: "NEXT",
      onClick: handleClick,
    },
  ];
  const buttonConfig3 = [
    {
      className: "button4",
      text: "Default Route",
      onClick: handleSkip,
    },
  ];

  return (
    <div className="bg-container">
      <div className="flex flex-col items-center justify-center p-4 space-y-4">
        <h1 className="text-2xl font-bold center">Welcome to RouteFinder!</h1>
        <ButtonGrid buttons={buttonConfig3} />
      </div>
      <div className="flex flex-row items-center justify-center">
        <PassengerScene />
        <Car1Scene />
      </div>
      <div className="flex flex-row items-center justify-around">
        <div className="flex flex-col items-center justify-center space-y-4">
          <h3 className="text-2xl font-bold">
            {passengers} {passengers == 1 ? "Passenger" : "Passengers"}
          </h3>
          <div className="flex flex-row items-center justify-center space-x-4">
            <ButtonGrid buttons={buttonConfig1} />
          </div>
                    <div className="w-40 h-15 flex flex-row items-center justify-center">
            <AnimatePresence>
              {passengerError == 1 && (
                <motion.div
                  key={passengerError}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ position: "relative" }}
                >
                  <ErrorCard type="too-many-passengers" />
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {passengerError == 2 && (
                <motion.div
                  key={passengerError}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ position: "relative" }}
                >
                  <ErrorCard type="no-passengers" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center space-y-4">
          <h3 className="text-2xl font-bold">
            {drivers} {drivers == 1 ? "Driver" : "Drivers"}
          </h3>
          <div className="flex flex-row items-center justify-center space-x-4">
            <ButtonGrid buttons={buttonConfig2} />
          </div>
          <div className="w-40 h-15 flex flex-row items-center justify-center">
            <AnimatePresence>
              {driversError == 1 && (
                <motion.div
                  key={driversError}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ position: "relative" }}
                >
                  <ErrorCard type="too-many-drivers" />
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {driversError == 2 && (
                <motion.div
                  key={driversError}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ position: "relative" }}
                >
                  <ErrorCard type="no-drivers" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="flex flex-row items-center justify-center p-2">
        <ButtonGrid buttons={buttonConfig4} />
      </div>
    </div>
  );
}
