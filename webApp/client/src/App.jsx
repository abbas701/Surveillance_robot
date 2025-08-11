import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminUsers from './pages/AdminUsers';
import { AuthProvider, useAuth } from './lib/authContext';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole = 'guest' }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="loading-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole === 'admin' && user.designation !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

// Main App Component
function AppContent() {
    const { user } = useAuth();

    return (
        <Router>
            <Routes>
                <Route
                    path="/login"
                    element={
                        user ? <Navigate to="/dashboard" replace /> : <Login />
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/users"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <AdminUsers />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/"
                    element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
                />
            </Routes>
        </Router>
    );
}

// Root App Component with Auth Provider
function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App; 