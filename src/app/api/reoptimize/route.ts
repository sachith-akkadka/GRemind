
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius') || '5000';

  if (!keyword || !lat || !lng) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?keyword=${encodeURIComponent(
      keyword as string
    )}&location=${lat},${lng}&radius=${radius}&key=${apiKey}&rankby=distance`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.results || data.results.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const places = data.results.map((place: any) => ({
      name: place.name,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      place_id: place.place_id,
      vicinity: place.vicinity,
    }));

    return NextResponse.json(places, { status: 200 });
  } catch (err) {
    console.error('reoptimize error', err);
    return NextResponse.json({ error: 'Failed to call Places API' }, { status: 500 });
  }
}
