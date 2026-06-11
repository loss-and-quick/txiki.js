import assert from 'tjs:assert';
import path from 'tjs:path';


const helpersDir = path.join(import.meta.dirname, 'helpers');
const decoder = new TextDecoder();

// Start the self-signed HTTPS server and read its port from stdout.
async function startTlsServer() {
    const proc = tjs.spawn([ tjs.exePath, 'run', path.join(helpersDir, 'tls-http-server.js') ], {
        stdout: 'pipe',
        stderr: 'pipe',
    });
    const reader = proc.stdout.getReader();
    let buf = '';

    while (!buf.includes('\n')) {
        const { value, done } = await reader.read();

        if (done) {
            break;
        }

        buf += decoder.decode(value);
    }

    reader.releaseLock();

    return { proc, port: parseInt(buf.trim()) };
}

async function runClient(port, allowInsecure) {
    const proc = tjs.spawn([ tjs.exePath, 'run', path.join(helpersDir, 'fetch-insecure-client.js') ], {
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
            ...tjs.env,
            TARGET_URL: `https://127.0.0.1:${port}/`,
            ALLOW_INSECURE: allowInsecure ? '1' : '0',
        },
    });
    const [ status, stdout, stderr ] = (
        await Promise.allSettled([ proc.wait(), proc.stdout.text(), proc.stderr.text() ])
    ).map(r => r.value);

    assert.eq(status.exit_status, 0, `client failed: ${stderr}`);

    return JSON.parse(stdout.trim());
}

// Each request gets a fresh server: a rejected TLS handshake and a completed
// one are independent connections, and reusing one server would couple them.
async function withServer(fn) {
    const server = await startTlsServer();

    try {
        return await fn(server.port);
    } finally {
        try {
            server.proc.kill('SIGTERM');
        } catch {
            // Already exited.
        }

        await server.proc.wait();
    }
}

// Without allowInsecure the self-signed certificate must fail verification.
const rejected = await withServer(port => runClient(port, false));

assert.ok(!rejected.ok, 'fetch rejects a self-signed certificate by default');

// With allowInsecure the same request succeeds.
const allowed = await withServer(port => runClient(port, true));

assert.ok(allowed.ok, `fetch succeeds with allowInsecure: ${allowed.error ?? ''}`);
assert.eq(allowed.status, 200, 'status is 200 with allowInsecure');
assert.eq(allowed.body, 'insecure ok', 'body received over the insecure connection');
