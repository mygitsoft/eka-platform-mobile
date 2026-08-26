import { createContext, useContext, useEffect, useState } from "react";
import { getAccessToken } from "./tokenStorage";
import {
    isTokenExpired,
    refreshAccessToken
} from "./authService";
const AuthContext = createContext();

export function AuthProvider({ children }) {

    const [authenticated, setAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        checkLogin();

    }, []);

    async function checkLogin() {

    console.log("========== CHECK LOGIN ==========");

    let token = await getAccessToken();

    console.log("Access token exists:", !!token);

    if (!token) {

        console.log("No access token");

        setAuthenticated(false);
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
        setLoading(false);

        return;
    }

    // Token is expired
    console.log("Access token expired. Attempting refresh...");

    const newToken = await refreshAccessToken();

    if (newToken) {

        console.log("Token refresh successful");

        setAuthenticated(true);

    } else {

        console.log("Token refresh failed");

        setAuthenticated(false);
    }

    setLoading(false);
}

    return (

        <AuthContext.Provider
            value={{
                authenticated,
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