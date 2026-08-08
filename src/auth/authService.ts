import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';
import { authConfig } from './authConfig';
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