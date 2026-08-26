import { useEffect, useRef, useState } from 'react';
// Location capturing is currently disabled.
// import { Geolocation } from '@capacitor/geolocation';
import { useAuth } from "./auth/AuthContext";

import LoginPage from "./pages/LoginPage";
import AppContainer from "./AppContainer";
import { calculateAttendanceAmount, getContractorOptions, validateAttendanceDate, validateAttendanceFields } from './utils/attendanceValidation';
import { AuthProvider } from "./auth/AuthContext";


function App() {
    const { authenticated, checkLogin } = useAuth();
    console.log("==========IS AUTHENTICATED ==========", authenticated);

    useEffect(() => {
        const handleAuthSaved = () => {
            checkLogin();
        };
        const handleAuthLogout = () => {
            checkLogin();
        };

        window.addEventListener('authTokensSaved', handleAuthSaved);
        window.addEventListener('authLogout', handleAuthLogout);
        return () => {
            window.removeEventListener('authTokensSaved', handleAuthSaved);
            window.removeEventListener('authLogout', handleAuthLogout);
        };
    }, [checkLogin]);

    if (!authenticated) {
        return <LoginPage />;
    }
    return <AppContainer />;
}
export default App;