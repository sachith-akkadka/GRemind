
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { keyword, lat, lng, radius = 5000 } = req.query;

  if (!keyword || !lat || !lng) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${encodeURIComponent(
      keyword as string
    )}&location=${lat},${lng}&radius=${radius}&key=${apiKey}`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.results || !data.results.length) {
      return res.status(404).json([]);
    }

    const places = data.results.map((place: any) => ({
      name: place.name,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      place_id: place.place_id,
    }));

    res.status(200).json(places);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch places' });
  }
}
