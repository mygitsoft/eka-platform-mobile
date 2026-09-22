import { useEffect } from "react";
import { login } from "../auth/authService";

function Login() {
    useEffect(() => {
        let cancelled = false;
        const loginTimer = setTimeout(async () => {
            if (cancelled) {
                return;
            }

            try {
                await login();
            } catch (error) {
                console.error("Failed to open Keycloak login:", error);
            }
        }, 500);

        return () => {
            cancelled = true;
            clearTimeout(loginTimer);
        };
    }, []);

    return (
        <div className="login-fullscreen">
            <div className="login-loading" aria-hidden="true">
                <div className="dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    );
}

export default Login;