import { useState } from "react";
import "./Fetch.css";

function SendData({ setFetchData, drivers, passengers}) {

  const handleSubmit = async (e) => {
    e.preventDefault();

    // build your payload
    const payload = {
      passengers,
      drivers,
    };

    const res = await fetch("http://0.0.0.0:8000/get-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("Submit failed", res.status);
    } else {
      const data = await res.json();
      console.log(passengers);
      console.log(drivers);
      console.log("Success", data);
      setFetchData(data);
    }
  };
  
  return (
    <button className="submit" type="submit" onClick={handleSubmit}>
      Send
    </button>
  );
}
export default SendData;
