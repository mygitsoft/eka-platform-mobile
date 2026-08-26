import { Preferences } from '@capacitor/preferences';

const ACCESS_TOKEN = "access_token";
const REFRESH_TOKEN = "refresh_token";

export async function saveTokens(accessToken, refreshToken) {

    await Preferences.set({
        key: ACCESS_TOKEN,
        value: accessToken
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

export async function clearTokens() {

    await Preferences.remove({
        key: ACCESS_TOKEN
    });

    await Preferences.remove({
        key: REFRESH_TOKEN
    });
}