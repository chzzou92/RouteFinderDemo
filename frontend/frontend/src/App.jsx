// App.jsx
import { Routes, Route, useLocation } from "react-router-dom";
import Landing from "./Landing.jsx";
import MainApp from "./MainApp";
import GetRoute from "./GetRoute.jsx";

export default function App() {
  const location = useLocation();
  const isMapPage = location.pathname === "/app";

  return (
    <div
      className={`w-full h-full ${
        isMapPage ? "absolute top-0 left-0 right-0 bottom-0" : ""
      }`}
    >
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/route" element={<GetRoute />} />
        <Route path="/app" element={<MainApp />} />
      </Routes>
    </div>
  );
}
