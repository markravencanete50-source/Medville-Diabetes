// This endpoint returns public catalog/campaign metadata only. It never accepts PHI.
export function createIntakeConfigHandler({ origins, resolveProduct, resolveReferral }) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Vary', 'Origin');
    const origin = req.get('Origin') || '';
    if (!origins.includes(origin)) return res.status(403).json({ error: 'Request not allowed.' });
    res.set('Access-Control-Allow-Origin', origin);
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(204).send('');
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
    const b = req.body;
    if (!b || typeof b !== 'object' || Array.isArray(b)
      || Object.keys(b).some(k => !['productInterest', 'referralCode'].includes(k))
      || typeof b.productInterest !== 'string' || !/^[a-z0-9][a-z0-9-]{0,59}$/.test(b.productInterest)
      || (b.referralCode && (typeof b.referralCode !== 'string' || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(b.referralCode)))) {
      return res.status(400).json({ error: 'Invalid request.' });
    }
    try {
      const [product, referralActive] = await Promise.all([
        resolveProduct(b.productInterest), b.referralCode ? resolveReferral(b.referralCode) : false,
      ]);
      return res.status(200).json({ product, referralActive });
    } catch { return res.status(503).json({ error: 'Catalog unavailable.' }); }
  };
}
