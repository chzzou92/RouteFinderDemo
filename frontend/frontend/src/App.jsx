// App.jsx
import { Routes, Route } from "react-router-dom";
import Landing from "./Landing.jsx";
import MainApp from "./MainApp";
import GetRoute from "./GetRoute.jsx"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/route" element={<GetRoute />} />
      <Route path="/app" element={<MainApp />} />
    </Routes>
  );
}
