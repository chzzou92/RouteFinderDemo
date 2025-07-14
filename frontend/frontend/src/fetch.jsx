import { useState } from "react";
import "./Fetch.css";
function SendData() {
  // form fields in state
const drivers = [[40.4174, -74.4927]];

const passengers = [
  [
    [40.439562, -74.436765],
    [40.452963, -74.674849],
  ],
  [
    [40.525454, -74.43755],
    [40.563496, -74.31936],
  ],
  [
    [40.56596, -74.48454],
    [40.555897, -74.611447],
  ],
  [
    [40.480098, -74.434529],
    [40.343104, -74.41297],
  ],
  [
    [40.482294, -74.44878],
    [40.340292, -74.570587],
  ],
  [
    [40.592058, -74.449443],
    [40.694155, -74.375534],
  ],
  [
    [40.484038, -74.452944],
    [40.461627, -74.267957],
  ],
  [
    [40.485142, -74.53506],
    [40.615775, -74.469859],
  ],
  [
    [40.47876, -74.37787],
    [40.570663, -74.29261],
  ],
  [
    [40.487974, -74.462616],
    [40.407822, -74.581453],
  ],
];

  // any “artificial” data you want to add
  const extraData = "someArtificialValue";

  const handleSubmit = async (e) => {
    e.preventDefault();

    // build your payload
    const payload = {
      passengers,
      drivers,
      // …etc
    };

    const res = await fetch("http://0.0.0.0:8000/get-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("Submit failed", res.status);
    } else {
      console.log("Success", await res.json());
    }
  };

  return (
    <button className="submit" type="submit" onClick={handleSubmit}>
      Send
    </button>
  );
}
export default SendData;
