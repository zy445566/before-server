const http = require('node:http');
const next = require('next');
const { WebSocketServer } = require('ws');
const logStream = require('./lib/logStream');

const dev = process.argv.includes('--dev');
const hostname = process.env.HOST || '0.0.0.0';
const port = Number.parseInt(process.env.PORT || '3000', 10);
const app = next({ dev, hostname, port });
const handleRequest = app.getRequestHandler();

function rejectUpgrade(socket, status, message) {
  socket.write(
    `HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`,
  );
  socket.destroy();
}

app.prepare().then(() => {
  const server = http.createServer((req, res) => handleRequest(req, res));
  const websocketServer = new WebSocketServer({ noServer: true });
  const handleNextUpgrade = app.getUpgradeHandler();

  websocketServer.on('connection', (socket, request, subscription) => {
    logStream.registerClient(socket, subscription.proxyId, subscription.connectionId);
    socket.send(JSON.stringify({
      type: 'ready',
      proxyId: subscription.proxyId,
      connectionId: subscription.connectionId || null,
    }));
  });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

    if (url.pathname !== '/ws/logs') {
      handleNextUpgrade(request, socket, head);
      return;
    }

    const proxyId = url.searchParams.get('proxyId');
    const connectionId = url.searchParams.get('connectionId') || undefined;

    if (!proxyId) {
      rejectUpgrade(socket, '400 Bad Request', 'Missing proxyId');
      return;
    }
    if (!logStream.isProxyActive(proxyId)) {
      rejectUpgrade(socket, '404 Not Found', 'Proxy not found');
      return;
    }

    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
      websocketServer.emit('connection', websocket, request, { proxyId, connectionId });
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
