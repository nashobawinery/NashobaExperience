import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Store, UtensilsCrossed, Star, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type CustomerType = "retail_liquor" | "restaurant";

interface Location {
  id: string;
  storeName: string;
  accountName: string;
  customerType: CustomerType | null;
  storeAddress: string | null;
  storeCity: string | null;
  storeState: string | null;
  storeZipCode: string | null;
  storePhone: string | null;
  mapLat?: number | null;
  mapLng?: number | null;
  coordsPrecise?: boolean;
  tierSortOrder: number | null;
}

interface StoreLocationsMapProps {
  locations: Location[];
  selectedLocationId: string | null;
  onLocationSelect: (id: string) => void;
}

const defaultIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background: #ea580c; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    </svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

const premiumIcon = L.divIcon({
  className: "custom-marker premium",
  html: `<div style="background: linear-gradient(135deg, #fbbf24, #ea580c); width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(251,191,36,0.5); display: flex; align-items: center; justify-content: center;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const selectedIcon = L.divIcon({
  className: "custom-marker selected",
  html: `<div style="background: #2563eb; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px rgba(37,99,235,0.6); display: flex; align-items: center; justify-content: center; animation: pulse 1.5s infinite;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

function MapController({ selectedLocationId, locations }: { selectedLocationId: string | null; locations: Location[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedLocationId) {
      const location = locations.find(l => l.id === selectedLocationId);
      if (location && location.mapLat && location.mapLng) {
        map.setView([location.mapLat, location.mapLng], 13, { animate: true });
      }
    }
  }, [selectedLocationId, locations, map]);
  
  return null;
}

export default function StoreLocationsMap({ locations, selectedLocationId, onLocationSelect }: StoreLocationsMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  
  const validLocations = locations.filter(l => l.mapLat && l.mapLng);
  
  const center: [number, number] = validLocations.length > 0
    ? [
        validLocations.reduce((sum, l) => sum + (l.mapLat || 0), 0) / validLocations.length,
        validLocations.reduce((sum, l) => sum + (l.mapLng || 0), 0) / validLocations.length,
      ]
    : [42.4, -71.5];
  
  const getIcon = (location: Location) => {
    if (selectedLocationId === location.id) return selectedIcon;
    if (location.tierSortOrder === 4) return premiumIcon;
    return defaultIcon;
  };

  if (validLocations.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/30 rounded-lg">
        <div className="text-center text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No locations with coordinates available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border">
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        .leaflet-popup-content {
          margin: 8px 12px;
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={9}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController selectedLocationId={selectedLocationId} locations={validLocations} />
        {validLocations.map((location) => (
          <Marker
            key={location.id}
            position={[location.mapLat!, location.mapLng!]}
            icon={getIcon(location)}
            eventHandlers={{
              click: () => onLocationSelect(location.id),
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                {location.tierSortOrder === 4 && (
                  <div className="flex items-center gap-1 text-amber-600 text-xs font-medium mb-1">
                    <Star className="h-3 w-3" fill="currentColor" />
                    Premium Supporter
                  </div>
                )}
                <div className="font-semibold text-sm">
                  {location.storeName || location.accountName}
                </div>
                {location.storeName && location.storeName !== location.accountName && (
                  <div className="text-xs text-muted-foreground">{location.accountName}</div>
                )}
                {location.customerType && (
                  <Badge variant="outline" className="text-xs mt-1">
                    {location.customerType === "retail_liquor" ? (
                      <><Store className="h-2.5 w-2.5 mr-1" />Retail</>
                    ) : (
                      <><UtensilsCrossed className="h-2.5 w-2.5 mr-1" />Restaurant</>
                    )}
                  </Badge>
                )}
                {(location.storeAddress || location.storeCity) && (
                  <div className="text-xs mt-2 text-muted-foreground">
                    {location.storeAddress && <div>{location.storeAddress}</div>}
                    {location.storeCity && (
                      <div>
                        {location.storeCity}
                        {location.storeState && `, ${location.storeState}`}
                        {location.storeZipCode && ` ${location.storeZipCode}`}
                      </div>
                    )}
                  </div>
                )}
                {location.storePhone && (
                  <div className="flex items-center gap-1 text-xs mt-2">
                    <Phone className="h-3 w-3" />
                    <a href={`tel:${location.storePhone}`} className="hover:underline">
                      {location.storePhone}
                    </a>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
