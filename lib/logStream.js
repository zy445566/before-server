const state = globalThis.__beforeServerLogStream__ || {
  clients: new Set(),
  activeProxyIds: new Set(),
};

globalThis.__beforeServerLogStream__ = state;

const { clients, activeProxyIds } = state;
const MAX_CLIENT_BUFFER_BYTES = 1024 * 1024;

function registerProxy(proxyId) {
  activeProxyIds.add(proxyId);
}

function isProxyActive(proxyId) {
  return activeProxyIds.has(proxyId);
}

function registerClient(socket, proxyId, connectionId) {
  const client = { socket, proxyId, connectionId, hasGap: false };
  clients.add(client);

  socket.on('close', () => clients.delete(client));
  socket.on('error', () => clients.delete(client));
}

function hasSubscribers(proxyId, connectionId) {
  for (const client of clients) {
    if (
      client.proxyId === proxyId &&
      client.socket.readyState === 1 &&
      (!client.connectionId || client.connectionId === connectionId)
    ) {
      return true;
    }
  }
  return false;
}

function broadcastLog(log) {
  let payload;

  for (const client of clients) {
    if (
      client.proxyId !== log.proxyId ||
      client.socket.readyState !== 1 ||
      (client.connectionId && client.connectionId !== log.connectionId)
    ) {
      continue;
    }

    if (client.socket.bufferedAmount > MAX_CLIENT_BUFFER_BYTES) {
      client.hasGap = true;
      continue;
    }

    if (client.hasGap) {
      client.socket.send(JSON.stringify({ type: 'gap', reason: 'backpressure' }));
      client.hasGap = false;
    }

    payload ??= JSON.stringify({ type: 'log', ...log });
    client.socket.send(payload);
  }
}

function closeProxy(proxyId) {
  activeProxyIds.delete(proxyId);
  const payload = JSON.stringify({ type: 'proxy_closed', proxyId });

  for (const client of [...clients]) {
    if (client.proxyId !== proxyId) continue;

    if (client.socket.readyState === 1) {
      client.socket.send(payload);
      client.socket.close(1000, 'Proxy closed');
    }
    clients.delete(client);
  }
}

module.exports = {
  broadcastLog,
  closeProxy,
  hasSubscribers,
  isProxyActive,
  registerClient,
  registerProxy,
};
