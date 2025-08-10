import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { keyword, lat, lng, radius = 5000 } = req.query;
  if (!keyword || !lat || !lng) return res.status(400).json({ error: 'Missing parameters' });

  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${encodeURIComponent(
      keyword as string
    )}&location=${lat},${lng}&radius=${radius}&key=${apiKey}`;

    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.results || data.results.length === 0) return res.status(200).json([]);

    const places = data.results.map((p: any) => ({
      name: p.name,
      lat: p.geometry.location.lat,
      lng: p.geometry.location.lng,
      place_id: p.place_id,
      vicinity: p.vicinity,
    }));

    res.status(200).json(places);
  } catch (err) {
    console.error('reoptimize error', err);
    res.status(500).json({ error: 'Failed to call Places API' });
  }
}
