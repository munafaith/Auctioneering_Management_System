import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Home from "./pages/Home";
import LotDetail from "./pages/LotDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyWins from "./pages/MyWins";
import ClientHome from "./pages/ClientHome";
import NewInstruction from "./pages/NewInstruction";
import AdminHome from "./pages/AdminHome";
import CaseReview from "./pages/CaseReview";
import Settlement from "./pages/Settlement";
import SettlementCase from "./pages/SettlementCase";
import BiddingMonitor from "./pages/BiddingMonitor";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/lots/:id" element={<LotDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/my-wins"
        element={<ProtectedRoute roles={["bidder"]}><MyWins /></ProtectedRoute>}
      />
      <Route
        path="/client"
        element={<ProtectedRoute roles={["client"]}><ClientHome /></ProtectedRoute>}
      />
      <Route
        path="/client/new"
        element={<ProtectedRoute roles={["client"]}><NewInstruction /></ProtectedRoute>}
      />
      <Route
        path="/admin"
        element={<ProtectedRoute roles={["admin"]}><AdminHome /></ProtectedRoute>}
      />
      <Route
        path="/admin/cases/:id"
        element={<ProtectedRoute roles={["admin"]}><CaseReview /></ProtectedRoute>}
      />
      <Route
        path="/admin/monitor"
        element={<ProtectedRoute roles={["admin"]}><BiddingMonitor /></ProtectedRoute>}
      />

      <Route
        path="/admin/settlement"
        element={<ProtectedRoute roles={["admin"]}><Settlement /></ProtectedRoute>}
      />
      <Route
        path="/admin/settlement/:id"
        element={<ProtectedRoute roles={["admin"]}><SettlementCase /></ProtectedRoute>}
      />
    </Routes>
  );
}