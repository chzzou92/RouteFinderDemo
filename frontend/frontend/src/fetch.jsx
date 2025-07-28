import { useState } from "react";
import Loader from "./Loader";
import TimeButton from "./TimeButton";
import "./Fetch.css";

function SendData({ setFetchData, drivers, passengers, getFinishedRoute }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fastestTime, setFastestTime] = useState(null);

  const handleSubmit = async (e) => {
    setSuccess(false);
    setLoading(true);
    e.preventDefault();

    // build your payload
    const payload = {
      passengers,
      drivers,
    };
    try {
      setSuccess(false);
      const res = await fetch("http://0.0.0.0:8000/get-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      console.log("Success", data);
      setFastestTime(data.shortestTime);
      getFinishedRoute(data.path);
      if (!res.ok) {
        throw new Error("Submit failed", res.status);
      }
    } finally {
      setLoading(false);
      setSuccess(true);
    }
  };

  return (
    <>
      <button className="submit" type="submit" onClick={handleSubmit}>
        Get Route
      </button>
      {loading && <Loader />}
      {success && <TimeButton time={fastestTime}/>}
    </>
  );
}
export default SendData;
