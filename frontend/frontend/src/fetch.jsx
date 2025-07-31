import { useState } from "react";
import Loader from "./Loader";
import TimeButton from "./TimeButton";
import "./Fetch.css";

function SendData({ setFetchData, drivers, passengers, drawMultipleRoutes }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
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
      setError(false);
      const res = await fetch("http://0.0.0.0:8000/get-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(true);
        throw new Error(`Submit failed: ${res.status}`);
      }

      console.log("Success", data);
     // const totalTime = data.paths.reduce((sum,p) => sum + p.shortestTime, 0);
      const maxTime = Math.max(...data.paths.map(p => p.shortestTime));
      setFastestTime(maxTime);
      const coordLists = data.paths.map(p => p.path);
      drawMultipleRoutes(coordLists);
    } catch (err) {
      console.error("Caught fetch error:", err);
      setError(true);
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
      {success && <TimeButton time={fastestTime} />}
      {error && <TimeButton time={-1} />}
    </>
  );
}
export default SendData;
