/**
 * MenuMaker - Professional Menu Creation Platform
 * Copyright (c) 2025 BHdesignsbyBILLY - Billy Harman
 * All Rights Reserved.
 * 
 * This software is proprietary and confidential.
 * Owned and controlled 100% by BHdesignsbyBILLY - Billy Harman
 * 
 * Unauthorized copying, distribution, modification, public display,
 * or public performance of this software is strictly prohibited.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Templates from './pages/Templates';
import Admin from './pages/Admin';
import { AuthProvider, useAuth } from './context/AuthContext';
import '@/App.css';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/auth" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App min-h-screen">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/templates" element={<PrivateRoute><Templates /></PrivateRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/editor/:menuId?" element={<PrivateRoute><Editor /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
          </Routes>
          <Toaster position="top-right" richColors />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
