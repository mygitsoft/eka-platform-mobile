function base64UrlEncode(arrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export function generateRandomString(length = 64) {

    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

    let result = '';

    const random = crypto.getRandomValues(new Uint8Array(length));

    random.forEach(x => {
        result += chars[x % chars.length];
    });

    return result;
}

export async function generateCodeChallenge(codeVerifier) {

    const encoder = new TextEncoder();

    const data = encoder.encode(codeVerifier);

    const digest = await crypto.subtle.digest('SHA-256', data);

    return base64UrlEncode(digest);

}