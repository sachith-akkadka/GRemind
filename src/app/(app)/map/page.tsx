
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function MapPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Task Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[60vh] rounded-lg overflow-hidden">
          <Map />
        </div>
      </CardContent>
    </Card>
  );
}
