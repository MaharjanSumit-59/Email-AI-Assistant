import { createContext, useEffect, useState } from "react";
import { getProfile } from "../services/userService";
import { getToken, removeToken, setToken } from "../utils/storage";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const login = async (token) => {
        setToken(token);

        try {
            const profile = await getProfile();
            setUser(profile);
        } catch (error) {
            console.error(error);
            removeToken();
            setUser(null);
        }
    };

    const logout = () => {
        removeToken();
        setUser(null);
    };

    useEffect(() => {
        const initializeAuth = async () => {
            const token = getToken();

            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const profile = await getProfile();
                setUser(profile);
            } catch (error) {
                removeToken();
                setUser(null);
            }

            setLoading(false);
        };

        initializeAuth();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}