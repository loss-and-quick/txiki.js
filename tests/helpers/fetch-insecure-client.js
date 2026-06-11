// Helper for test-fetch-allow-insecure.js
// Fetches TARGET_URL (optionally with allowInsecure) and prints a JSON result.

const url = tjs.env.TARGET_URL;
const init = tjs.env.ALLOW_INSECURE === '1' ? { allowInsecure: true } : {};

try {
    const resp = await fetch(url, init);
    const body = await resp.text();

    console.log(JSON.stringify({ ok: true, status: resp.status, body }));
} catch (e) {
    console.log(JSON.stringify({ ok: false, error: String(e) }));
}
