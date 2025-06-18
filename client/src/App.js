import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from '@mui/material';

// Layout components
import Layout from './components/Layout/Layout';

// Auth components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import { checkAuthStatus } from './features/auth/authSlice';

// Public pages
import Home from './pages/Home';
import About from './pages/About';

// Protected pages
import Dashboard from './pages/Dashboard';
import BookingCalendar from './pages/BookingCalendar';
import StudioManagement from './pages/StudioManagement';
import EquipmentManagement from './pages/EquipmentManagement';
import StaffManagement from './pages/StaffManagement';
import ClientManagement from './pages/ClientManagement';
import PaymentManagement from './pages/PaymentManagement';
import Reports from './pages/Reports';
import Profile from './pages/Profile';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useSelector((state) => state.auth);
  
  if (isLoading) {
    return <Box>Loading...</Box>;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  const dispatch = useDispatch();
  
  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        
        {/* Protected routes */}
        <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="calendar" element={<ProtectedRoute><BookingCalendar /></ProtectedRoute>} />
        <Route path="studios" element={<ProtectedRoute><StudioManagement /></ProtectedRoute>} />
        <Route path="equipment" element={<ProtectedRoute><EquipmentManagement /></ProtectedRoute>} />
        <Route path="staff" element={<ProtectedRoute><StaffManagement /></ProtectedRoute>} />
        <Route path="clients" element={<ProtectedRoute><ClientManagement /></ProtectedRoute>} />
        <Route path="payments" element={<ProtectedRoute><PaymentManagement /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Route>
      
      {/* 404 route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
