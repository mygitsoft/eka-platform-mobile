import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App as CapacitorApp } from '@capacitor/app'
import { exchangeCodeForToken } from "./auth/authService";
import { saveTokens } from "./auth/tokenStorage";

import './index.css'
import App from './App.jsx'
import { AuthProvider } from "./auth/AuthContext";


CapacitorApp.addListener('appUrlOpen', async (event) => {
    console.log("========== CALLBACK RECEIVED ==========");
    console.log(event.url);
    const url = new URL(event.url);
    const code = url.searchParams.get("code");
    if (!code) {
        console.log("No authorization code");
        return;
    }
    try {
        const tokens = await exchangeCodeForToken(code);
        console.log(tokens);
        await saveTokens(tokens.access_token, tokens.refresh_token);
        window.dispatchEvent(new Event('authTokensSaved'));
        console.log("Tokens Saved");
    } catch (e) {
        console.error(e);
    }

});



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
