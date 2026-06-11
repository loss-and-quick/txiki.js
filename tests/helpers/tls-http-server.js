// Minimal HTTPS server on a self-signed certificate for fetch tests.
// Prints the listening port on stdout and answers every request with a fixed
// body. Runs until killed by the parent test.
import path from 'tjs:path';

const fixtures = path.join(import.meta.dirname, '..', 'fixtures');
const decoder = new TextDecoder();

const [ cert, key ] = await Promise.all([
    tjs.readFile(path.join(fixtures, 'server-cert.pem')),
    tjs.readFile(path.join(fixtures, 'server-key.pem')),
]);

const server = tjs.serve({
    port: 0,
    listenIp: '127.0.0.1',
    tls: { cert: decoder.decode(cert), key: decoder.decode(key) },
    fetch: () => new Response('insecure ok'),
});

console.log(String(server.port));
