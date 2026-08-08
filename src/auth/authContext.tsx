import { createContext, useContext, useEffect, useState } from "react";
import { getAccessToken } from "./tokenStorage";

const AuthContext = createContext();

export function AuthProvider({ children }) {

    const [authenticated, setAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        checkLogin();

    }, []);

    async function checkLogin() {

        const token = await getAccessToken();

        if (token) {
            setAuthenticated(true);
        } else {
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