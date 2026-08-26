const BASE = 'https://mantledb.sh';
const NS = 'salsa-squad-votes-v6';
const ENTRY = `${BASE}/v2/${NS}/votes`;
const INCREMENT = `${BASE}/v2/increment/${NS}/votes`;

async function readText(response) {
  try { return await response.text(); } catch { return ''; }
}

async function ensureEntry() {
  const read = await fetch(ENTRY, { cache: 'no-store' });
  if (read.ok) {
    const text = await readText(read);
    return text ? JSON.parse(text) : {};
  }

  if (read.status !== 404) {
    throw new Error(`storage_read_${read.status}:${await readText(read)}`);
  }

  const init = await fetch(ENTRY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });

  if (!init.ok) {
    throw new Error(`storage_init_${init.status}:${await readText(init)}`);
  }

  return {};
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    if (req.method === 'GET') {
      const data = await ensureEntry();
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { id, by = 1 } = req.body || {};
      const amount = Number(by);

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'invalid_vote_id' });
      }
      if (!Number.isFinite(amount) || Math.abs(amount) > 1) {
        return res.status(400).json({ error: 'invalid_increment' });
      }

      await ensureEntry();

      const increment = await fetch(INCREMENT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: id, by: amount })
      });

      const text = await readText(increment);
      if (!increment.ok) {
        return res.status(502).json({
          error: 'storage_increment_failed',
          storageStatus: increment.status,
          storageBody: text
        });
      }

      try {
        return res.status(200).json(text ? JSON.parse(text) : { success: true });
      } catch {
        return res.status(200).json({ success: true });
      }
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (error) {
    return res.status(502).json({
      error: 'storage_failed',
      detail: String(error?.message || error)
    });
  }
}
