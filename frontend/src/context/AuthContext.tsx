"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TokenResponse, UserResponse, fetchCurrentUser } // Import fetchCurrentUser
    from '@/lib/api';

// Define the shape of the auth context
interface AuthContextType {
    isAuthenticated: boolean;
    user: UserResponse | null; // Or a more specific frontend user type
    token: string | null;
    login: (tokenData: TokenResponse) => void; // userData parameter removed
    logout: () => void;
    isLoading: boolean; // To handle initial auth state loading
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<UserResponse | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Start with loading true

    useEffect(() => {
        const attemptAutoLogin = async () => {
            const storedToken = localStorage.getItem('authToken');
            if (storedToken) {
                try {
                    const currentUser = await fetchCurrentUser(storedToken);
                    setToken(storedToken);
                    setUser(currentUser);
                    setIsAuthenticated(true);
                } catch (error) {
                    console.error("Auto-login failed, token might be invalid:", error);
                    localStorage.removeItem('authToken'); // Clear invalid token
                    // Any other cleanup if needed
                }
            }
            setIsLoading(false);
        };
        attemptAutoLogin();
    }, []);

    // userData parameter removed from login function signature
    const login = async (tokenData: TokenResponse) => {
        localStorage.setItem('authToken', tokenData.access_token);
        setToken(tokenData.access_token);
        try {
            const currentUser = await fetchCurrentUser(tokenData.access_token);
            setUser(currentUser);
            setIsAuthenticated(true);
        } catch (error) {
            console.error("Failed to fetch user details after login:", error);
            // Handle error - maybe logout or show a message
            // For now, we'll be in a state where token is set but user details might be missing
            // Consider logging out if user details can't be fetched
            setIsAuthenticated(true); // Or false if user details are mandatory
            setUser(null);
        }
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenType'); // If you stored this
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        // Optionally redirect to login page
        // Consider using Next.js router for navigation if this context is used within Next app structure
        // For example, if router is passed or accessible via a hook.
        // For now, direct window manipulation is a simple placeholder.
        // if (typeof window !== "undefined") window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
