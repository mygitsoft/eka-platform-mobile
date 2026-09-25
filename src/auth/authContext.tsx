import { createContext, useContext, useEffect, useState } from "react";
import { getAccessToken, getRoles } from "./tokenStorage";
import {
    isTokenExpired,
    refreshAccessToken
} from "./authService";
const AuthContext = createContext();

export function AuthProvider({ children }) {

    const [authenticated, setAuthenticated] = useState(false);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkLogin();

        const handleTokensSaved = () => checkLogin();
        const handleLogout = () => {
            setAuthenticated(false);
            setRoles([]);
        };

        window.addEventListener('authTokensSaved', handleTokensSaved);
        window.addEventListener('authLogout', handleLogout);

        return () => {
            window.removeEventListener('authTokensSaved', handleTokensSaved);
            window.removeEventListener('authLogout', handleLogout);
        };
    }, []);

    async function checkLogin() {

    console.log("========== CHECK LOGIN ==========");

    let token = await getAccessToken();

    console.log("Access token exists:", !!token);

    if (!token) {

        console.log("No access token");

        setAuthenticated(false);
        setRoles([]);
        setLoading(false);

        return;
    }

    console.log(
        "Access token expired:",
        isTokenExpired(token)
    );

    // Token is still valid
    if (!isTokenExpired(token)) {

        console.log("Access token is valid");

        setAuthenticated(true);
        setRoles(await getRoles());
        setLoading(false);

        return;
    }

    // Token is expired
    console.log("Access token expired. Attempting refresh...");

    const newToken = await refreshAccessToken();

    if (newToken) {

        console.log("Token refresh successful");

        setAuthenticated(true);
        setRoles(await getRoles());

    } else {

        console.log("Token refresh failed");

        setAuthenticated(false);
        setRoles([]);
    }

    setLoading(false);
}

    return (

        <AuthContext.Provider
            value={{
                authenticated,
                roles,
                setAuthenticated,
                checkLogin
            }}
        >

            {loading ? <div>Loading...</div> : children}

        </AuthContext.Provider>

    );

}

export function useAuth() {

    return useContext(AuthContext);

}