import { Preferences } from '@capacitor/preferences';

const ACCESS_TOKEN = "access_token";
const REFRESH_TOKEN = "refresh_token";
const ROLES = "roles";

function getTokenPayload(token) {
    if (!token) return null;

    try {
        const encodedPayload = token.split('.')[1];
        if (!encodedPayload) return null;

        const normalizedPayload = encodedPayload
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const paddedPayload = normalizedPayload.padEnd(
            normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
            '='
        );

        return JSON.parse(atob(paddedPayload));
    } catch (error) {
        console.error("Unable to read access token roles:", error);
        return null;
    }
}

function getRolesFromToken(accessToken) {
    const roles = getTokenPayload(accessToken)?.realm_access?.roles;
    return Array.isArray(roles) ? roles : [];
}

export async function saveTokens(accessToken, refreshToken) {

    await Preferences.set({
        key: ACCESS_TOKEN,
        value: accessToken
    });

    await Preferences.set({
        key: ROLES,
        value: JSON.stringify(getRolesFromToken(accessToken))
    });

    if (refreshToken) {
        await Preferences.set({
            key: REFRESH_TOKEN,
            value: refreshToken
        });
    }
}

export async function getAccessToken() {

    const { value } = await Preferences.get({
        key: ACCESS_TOKEN
    });

    return value;
}

export async function getRefreshToken() {

    const { value } = await Preferences.get({
        key: REFRESH_TOKEN
    });

    return value;
}

export async function getRoles() {
    const { value } = await Preferences.get({
        key: ROLES
    });

    if (!value) return [];

    try {
        const roles = JSON.parse(value);
        return Array.isArray(roles) ? roles : [];
    } catch (error) {
        console.error("Unable to read stored roles:", error);
        return [];
    }
}

export async function clearTokens() {

    await Preferences.remove({
        key: ACCESS_TOKEN
    });

    await Preferences.remove({
        key: REFRESH_TOKEN
    });

    await Preferences.remove({
        key: ROLES
    });
}