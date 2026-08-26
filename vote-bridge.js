(() => {
  const nativeFetch = window.fetch.bind(window);
  const NS = 'salsa-squad-votes-public-v9';
  const ENTRY = `https://mantledb.sh/v2/${NS}/votes`;
  const INCREMENT = `https://mantledb.sh/v2/increment/${NS}/votes`;

  async function ensureEntry() {
    let r = await nativeFetch(ENTRY, { cache: 'no-store' });
    if (r.ok) return r;
    if (r.status !== 404) return r;

    const init = await nativeFetch(ENTRY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    if (!init.ok) return init;

    return new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  window.fetch = async function(input, init = {}) {
    const url = typeof input === 'string' ? input : input?.url;
    if (url !== '/api/votes') return nativeFetch(input, init);

    const method = String(init.method || 'GET').toUpperCase();

    if (method === 'GET') {
      return ensureEntry();
    }

    if (method === 'POST') {
      let payload = {};
      try { payload = JSON.parse(init.body || '{}'); } catch {}
      const id = payload.id;
      const by = Number(payload.by ?? 1);

      if (!id || !Number.isFinite(by) || Math.abs(by) > 1) {
        return new Response(JSON.stringify({ error: 'invalid_vote_request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const ready = await ensureEntry();
      if (!ready.ok) return ready;

      return nativeFetch(INCREMENT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: id, by })
      });
    }

    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  };
})();
