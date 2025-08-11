import { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check if user is already authenticated on app load
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const response = await api.get('/auth/me');
            if (response.data.success) {
                setUser(response.data.user);
            }
        } catch (error) {
            console.log('User not authenticated');
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/login', { username, password });

            if (response.data.success) {
                setUser(response.data.user);
                return { success: true, user: response.data.user };
            } else {
                return { success: false, message: response.data.error };
            }
        } catch (error) {
            const message = error.response?.data?.error || 'Login failed';
            return { success: false, message };
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
        }
    };

    const value = {
        user,
        loading,
        login,
        logout,
        checkAuthStatus
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}; 