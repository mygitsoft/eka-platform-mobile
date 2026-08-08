import { useEffect } from "react";
import { login } from "../auth/authService";

function Login() {
    useEffect(() => {
        login();
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