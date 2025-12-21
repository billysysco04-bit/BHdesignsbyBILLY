import React, { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";

// Pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import MenuUpload from "./pages/MenuUpload";
import MenuAnalysis from "./pages/MenuAnalysis";
import SavedMenus from "./pages/SavedMenus";
import CreditsPage from "./pages/CreditsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SubscriptionPage from "./pages/SubscriptionPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem("token");
          setToken(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user } = response.data;
    localStorage.setItem("token", access_token);
    setToken(access_token);
    setUser(user);
    return user;
  };

  const register = async (data) => {
    const response = await axios.post(`${API}/auth/register`, data);
    const { access_token, user } = response.data;
    localStorage.setItem("token", access_token);
    setToken(access_token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
};

function App() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <BrowserRouter>
        <AuthProvider>
          <Toaster 
            position="top-right" 
            theme="dark" 
            richColors 
            closeButton
          />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/upload" element={
              <ProtectedRoute><MenuUpload /></ProtectedRoute>
            } />
            <Route path="/menu/:jobId" element={
              <ProtectedRoute><MenuAnalysis /></ProtectedRoute>
            } />
            <Route path="/menus" element={
              <ProtectedRoute><SavedMenus /></ProtectedRoute>
            } />
            <Route path="/credits" element={
              <ProtectedRoute><CreditsPage /></ProtectedRoute>
            } />
            <Route path="/subscription" element={
              <ProtectedRoute><SubscriptionPage /></ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute><AnalyticsPage /></ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
