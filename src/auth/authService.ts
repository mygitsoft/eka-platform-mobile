import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';
import { authConfig } from './authConfig';
import { saveTokens, getRefreshToken, clearTokens } from "./tokenStorage";
import { generateCodeChallenge, generateRandomString } from './pkce';

export async function login() {


    const state = generateRandomString(32);

    const codeVerifier = generateRandomString(64);

    const codeChallenge =
        await generateCodeChallenge(codeVerifier);

    await Preferences.set({
        key: "pkce_code_verifier",
        value: codeVerifier
    });


    const authUrl =
        `${authConfig.authority}/protocol/openid-connect/auth` +
        `?client_id=${encodeURIComponent(authConfig.clientId)}` +
        `&redirect_uri=${encodeURIComponent(authConfig.redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(authConfig.scope)}` +
        `&state=${encodeURIComponent(state)}` +
        `&code_challenge=${encodeURIComponent(codeChallenge)}` +
        `&code_challenge_method=S256`;

    console.log('Opening Keycloak:');
    console.log(authUrl);

    await Browser.open({
        url: authUrl,
    });

}

export async function logout() {
    const refreshToken = await getRefreshToken();

    // Remove local tokens first
    await clearTokens();

    // Remove PKCE verifier too
    await Preferences.remove({
        key: "pkce_code_verifier",
    });

    // Build Keycloak logout URL
    let logoutUrl =
        `${authConfig.authority}/protocol/openid-connect/logout` +
        `?client_id=${encodeURIComponent(authConfig.clientId)}` +
        `&post_logout_redirect_uri=${encodeURIComponent(authConfig.redirectUri)}`;

    // Send refresh token if available so Keycloak destroys the SSO session.
    if (refreshToken) {
        logoutUrl += `&refresh_token=${encodeURIComponent(refreshToken)}`;
    }

    console.log("Logging out:", logoutUrl);

    await Browser.open({
        url: logoutUrl,
    });
}


export async function exchangeCodeForToken(code) {

    const { value: codeVerifier } = await Preferences.get({
        key: "pkce_code_verifier"
    });

    const body = new URLSearchParams();

    body.append("grant_type", "authorization_code");
    body.append("client_id", authConfig.clientId);
    body.append("code", code);
    body.append("redirect_uri", authConfig.redirectUri);
    body.append("code_verifier", codeVerifier);

    const response = await fetch(

        `${authConfig.authority}/protocol/openid-connect/token`,

        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body
        }
    );

    if (!response.ok) {

        const text = await response.text();

        throw new Error(text);

    }

    const tokenResponse = await response.json();

    console.log(tokenResponse);

    return tokenResponse;

}
export function isTokenExpired(token) {

    if (!token) {
        return true;
    }

    try {

        const payload = JSON.parse(
            atob(
                token
                    .split('.')[1]
                    .replace(/-/g, '+')
                    .replace(/_/g, '/')
            )
        );

        const currentTime = Math.floor(Date.now() / 1000);

        return payload.exp <= currentTime;

    } catch (error) {

        console.error("Invalid JWT:", error);

        return true;
    }
}
export async function refreshAccessToken() {

    const refreshToken = await getRefreshToken();

    if (!refreshToken) {

        console.log("No refresh token available");

        return null;
    }

    const body = new URLSearchParams();

    body.append("grant_type", "refresh_token");
    body.append("client_id", authConfig.clientId);
    body.append("refresh_token", refreshToken);

    try {

        const response = await fetch(
            `${authConfig.authority}/protocol/openid-connect/token`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body
            }
        );

        if (!response.ok) {

            const text = await response.text();

            console.error(
                "Refresh token failed:",
                response.status,
                text
            );

            await clearTokens();

            return null;
        }

        const tokens = await response.json();

        console.log("========== TOKEN REFRESHED ==========");

        console.log(
            "New access token received:",
            !!tokens.access_token
        );

        console.log(
            "New refresh token received:",
            !!tokens.refresh_token
        );

        await saveTokens(
            tokens.access_token,
            tokens.refresh_token || refreshToken
        );

        return tokens.access_token;

    } catch (error) {

        console.error("Token refresh error:", error);

        await clearTokens();

        return null;
    }
}