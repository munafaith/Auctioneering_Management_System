import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ClientHome from "./pages/ClientHome";
import AdminHome from "./pages/AdminHome";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/client"
        element={<ProtectedRoute roles={["client"]}><ClientHome /></ProtectedRoute>}
      />
      <Route
        path="/admin"
        element={<ProtectedRoute roles={["admin"]}><AdminHome /></ProtectedRoute>}
      />
    </Routes>
  );
}