"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    TokenResponse,
    UserResponse,
    fetchCurrentUser,
    Company, // Import Company type
    fetchCompanies // Import fetchCompanies function
} from '@/lib/api';

// Define the shape of the auth context
interface AuthContextType {
    isAuthenticated: boolean;
    user: UserResponse | null; // Or a more specific frontend user type
    token: string | null;
    login: (tokenData: TokenResponse) => void; // userData parameter removed
    logout: () => void;
    isLoading: boolean; // To handle initial auth state loading
    companiesList: Company[] | null;
    getCompanyName: (companyCode: number) => string | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<UserResponse | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Start with loading true
    const [companiesList, setCompaniesList] = useState<Company[] | null>(null);

    useEffect(() => {
        const attemptAutoLogin = async () => {
            const storedToken = localStorage.getItem('authToken');
            if (storedToken) {
                try {
                    const currentUser = await fetchCurrentUser(storedToken);
                    setToken(storedToken);
                    setUser(currentUser);
                    setIsAuthenticated(true);
                    // Fetch companies list
                    try {
                        const companies = await fetchCompanies();
                        setCompaniesList(companies);
                    } catch (companyError) {
                        console.error("Failed to fetch companies list during auto-login:", companyError);
                        setCompaniesList(null); // Or handle as needed
                    }
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
        setIsLoading(true);
        localStorage.setItem('authToken', tokenData.access_token);
        setToken(tokenData.access_token);

        let fetchedUser: UserResponse | null = null;

        try {
            fetchedUser = await fetchCurrentUser(tokenData.access_token);
            setUser(fetchedUser);
            setIsAuthenticated(true);

            // If user fetch is successful, try to fetch companies
            try {
                const companies = await fetchCompanies();
                setCompaniesList(companies);
            } catch (companyError) {
                console.error("Failed to fetch companies list after login:", companyError);
                setCompaniesList(null); // Still authenticated, but no company list
            }

        } catch (error) {
            console.error("Failed to fetch user details after login or during login process:", error);
            // If user fetch fails, login is considered failed. Clean up.
            localStorage.removeItem('authToken');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            setCompaniesList(null);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenType'); // If you stored this
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setCompaniesList(null); // Clear companies list on logout
        // Optionally redirect to login page
        // Consider using Next.js router for navigation if this context is used within Next app structure
        // For example, if router is passed or accessible via a hook.
        // For now, direct window manipulation is a simple placeholder.
        // if (typeof window !== "undefined") window.location.href = '/login';
    };

    const getCompanyName = (companyCode: number): string | undefined => {
        if (!companiesList) return undefined;
        const company = companiesList.find(c => c.company_code === companyCode);
        return company?.name;
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, token, login, logout, isLoading, companiesList, getCompanyName }}>
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
