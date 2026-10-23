const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { test } = require('node:test');

// Exercise the actual HTTP app and both RPC clients against local protocol
// fixtures. No running Bitcoin node, wallet, or external network is needed.
test('dashboard runtime compatibility', { timeout: 30000 }, async (t) => {
  const state = { ibd: false, blocks: 200, height: 100, rpcError: false, electrumError: false };
  const bitcoinCalls = [];
  const electrumCalls = [];
  const sockets = new Set();
  const bitcoin = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const call = JSON.parse(body);
      bitcoinCalls.push({ ...call, authorization: req.headers.authorization });
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
        id: call.id,
        result: state.rpcError ? null : { initialblockdownload: state.ibd, blocks: state.blocks },
        error: state.rpcError ? { code: -28, message: 'Loading block index' } : null,
      }));
    });
  });
  const electrum = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const call = JSON.parse(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        electrumCalls.push(call);
        const result = call.method === 'server.version'
          ? ['electrs/0.11.1', '1.4']
          : { height: state.height, hex: '00'.repeat(80) };
        socket.write(JSON.stringify({
          jsonrpc: '2.0', id: call.id,
          ...(state.electrumError
            ? { error: { code: -32603, message: 'Server warming up' } }
            : { result }),
        }) + '\n');
      }
    });
  });

  let app;
  t.after(async () => {
    if (app && app.exitCode === null) {
      const exited = once(app, 'exit');
      app.kill('SIGTERM');
      await exited;
    }
    for (const socket of sockets) socket.destroy();
    await Promise.all([bitcoin, electrum].map((server) => new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections?.();
    })));
  });
  bitcoin.listen(0, '127.0.0.1');
  await once(bitcoin, 'listening');
  electrum.listen(50001, '127.0.0.1');
  await once(electrum, 'listening');

  let logs = '';
  app = spawn(process.execPath, ['bin/www'], {
    cwd: path.join(__dirname, '../apps/backend'),
    env: {
      ...process.env, PORT: '0', ELECTRS_HOST: '127.0.0.1',
      BITCOIN_HOST: '127.0.0.1', RPC_PORT: String(bitcoin.address().port),
      RPC_USER: 'fixture', RPC_PASSWORD: 'synthetic-password',
      ELECTRUM_LOCAL_SERVICE: 'fixture.local',
      ELECTRUM_HIDDEN_SERVICE: 'syntheticfixture.onion', ELECTRUM_PORT: '50001',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  app.stderr.on('data', (chunk) => { logs += chunk; });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`App startup timed out: ${logs}`)), 10000);
    app.once('error', (error) => { clearTimeout(timer); reject(error); });
    app.once('exit', (code) => { clearTimeout(timer); reject(new Error(`App exited ${code}: ${logs}`)); });
    app.stdout.on('data', (chunk) => {
      logs += chunk;
      const match = logs.match(/Listening on port (\d+)/);
      if (match) { clearTimeout(timer); resolve(Number(match[1])); }
    });
  });
  const url = `http://127.0.0.1:${port}`;
  const get = async (route) => {
    const response = await fetch(url + route, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200, route);
    return response.json();
  };
  const sync = () => get('/v1/electrs/syncPercent');

  await t.test('health check and request middleware work', async () => {
    assert.deepEqual(await get('/ping'), { version: 'umbrel-middleware-0.1.12' });
  });
  await t.test('local and Tor connection details preserve their exact format', async () => {
    assert.deepEqual(await get('/v1/electrs/electrum-connection-details'), {
      tor: { address: 'syntheticfixture.onion', port: '50001', connectionString: 'syntheticfixture.onion:50001:t' },
      local: { address: 'fixture.local', port: '50001', connectionString: 'fixture.local:50001:t' },
    });
  });
  await t.test('Electrum handshake and server version are compatible', async () => {
    assert.equal(await get('/v1/electrs/version'), '0.11.1');
    assert.equal(electrumCalls[0].method, 'server.version');
    assert.deepEqual(electrumCalls[0].params, ['umbrel', '1.4']);
  });
  await t.test('Bitcoin RPC authentication and partial sync are preserved', async () => {
    assert.equal(await sync(), 50);
    assert.equal(bitcoinCalls.at(-1).method, 'getblockchaininfo');
    assert.equal(bitcoinCalls.at(-1).authorization, 'Basic ' + Buffer.from('fixture:synthetic-password').toString('base64'));
    assert.equal(electrumCalls.at(-1).method, 'blockchain.headers.subscribe');
  });
  await t.test('Bitcoin initial sync skips the Electrum call', async () => {
    state.ibd = true;
    const before = electrumCalls.length;
    assert.equal(await sync(), -1);
    assert.equal(electrumCalls.length, before);
    state.ibd = false;
  });
  await t.test('fully synced and zero-indexed heights keep numeric responses', async () => {
    state.height = 200;
    assert.equal(await sync(), 100);
    state.height = 0;
    assert.equal(await sync(), 0);
    state.height = 100;
  });
  await t.test('Bitcoin startup errors return waiting status and recover', async () => {
    state.rpcError = true;
    assert.equal(await sync(), -2);
    state.rpcError = false;
    assert.equal(await sync(), 50);
  });
  await t.test('Electrum errors return waiting status and recover', async () => {
    state.electrumError = true;
    assert.equal(await sync(), -2);
    state.electrumError = false;
    assert.equal(await sync(), 50);
  });
  await t.test('parallel requests preserve their individual responses', async () => {
    const values = await Promise.all(Array.from({ length: 12 }, () => sync()));
    assert.deepEqual(values, Array(12).fill(50));
    assert.equal(app.exitCode, null);
  });
  await t.test('built dashboard and its JavaScript assets are served', async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /id=["']?app/);
    const scripts = [...html.matchAll(/<script[^>]+src=["']?([^\s"'>]+)/g)].map((match) => match[1]);
    assert.ok(scripts.length > 0);
    for (const script of scripts) {
      const asset = await fetch(new URL(script, url), { signal: AbortSignal.timeout(5000) });
      assert.equal(asset.status, 200);
      assert.match(asset.headers.get('content-type'), /javascript/);
      assert.ok((await asset.text()).length > 100);
    }
  });
  await t.test('unknown routes and malformed JSON retain HTTP errors', async () => {
    assert.equal((await fetch(url + '/missing')).status, 404);
    const response = await fetch(url + '/ping', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
    });
    assert.equal(response.status, 400);
    assert.equal(app.exitCode, null);
  });
});
