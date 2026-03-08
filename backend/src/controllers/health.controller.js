export function healthCheck(_req, res) {
  res.json({ ok: true, at: new Date().toISOString() });
}
