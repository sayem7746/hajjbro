import React, { useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import { useLocation } from 'react-router-dom';
import { locationOutline, navigateOutline } from 'ionicons/icons';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import AppHeader from '../components/AppHeader';
import { useOfflineLocations } from '../hooks/useOfflineData';
import { useKafela } from '../contexts/KafelaContext';
import { useKafelaLocationSharing } from '../hooks/useKafelaLocationSharing';
import { kafelaApi } from '../services/kafelaApi';
import type { VisibleLocation } from '../types/kafela';
import { HajjLocation } from '../types';
import 'leaflet/dist/leaflet.css';
import './Map.css';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = defaultIcon;

const MAKKAH_CENTER: [number, number] = [21.4225, 39.8262];

function formatAge(ageMs: number | null | undefined): string {
  if (ageMs == null) return 'unknown';
  const mins = Math.floor(ageMs / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

const MapPage: React.FC = () => {
  const routeLocation = useLocation();
  const initialLayer =
    new URLSearchParams(routeLocation.search).get('view') === 'kafela' ? 'kafela' : 'sites';

  const { locations } = useOfflineLocations();
  const { kafela, me } = useKafela();
  const [layer, setLayer] = useState<'sites' | 'kafela'>(initialLayer);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [selected, setSelected] = useState<HajjLocation | null>(null);
  const [people, setPeople] = useState<VisibleLocation[]>([]);
  const [groupFilter, setGroupFilter] = useState('');
  const [staleOnly, setStaleOnly] = useState(false);

  useKafelaLocationSharing(
    layer === 'kafela' ? kafela?.id : null,
    Boolean(me?.sharingEnabled && layer === 'kafela')
  );

  useEffect(() => {
    const q = new URLSearchParams(routeLocation.search).get('view');
    if (q === 'kafela') setLayer('kafela');
  }, [routeLocation.search]);

  useEffect(() => {
    if (layer !== 'kafela' || !kafela) return;
    let cancelled = false;

    const pull = async () => {
      try {
        const list = await kafelaApi.listLocations(kafela.id);
        if (!cancelled) setPeople(list);
      } catch {
        if (!cancelled) setPeople([]);
      }
    };

    void pull();
    const id = setInterval(() => void pull(), 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [layer, kafela]);

  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      if (groupFilter && p.group?.id !== groupFilter) return false;
      if (staleOnly) {
        if (!p.sharingEnabled) return true;
        if (!p.location || p.location.stale) return true;
        return false;
      }
      return true;
    });
  }, [people, groupFilter, staleOnly]);

  const peopleWithCoords = filteredPeople.filter((p) => p.location);

  const handleSelect = (loc: HajjLocation) => {
    setSelected(loc);
    setView('map');
    setLayer('sites');
  };

  const mapCenter: [number, number] = useMemo(() => {
    if (layer === 'kafela' && peopleWithCoords[0]?.location) {
      return [peopleWithCoords[0].location.latitude, peopleWithCoords[0].location.longitude];
    }
    if (selected) return [selected.latitude, selected.longitude];
    return MAKKAH_CENTER;
  }, [layer, peopleWithCoords, selected]);

  const groupOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of people) {
      if (p.group) map.set(p.group.id, p.group.name);
    }
    return [...map.entries()];
  }, [people]);

  return (
    <IonPage>
      <AppHeader title={layer === 'kafela' ? 'Kafela map' : 'Sacred map'} />
      <IonContent fullscreen className="sanctuary-content">
        <IonSegment
          value={layer}
          onIonChange={(e) => setLayer((e.detail.value as 'sites' | 'kafela') || 'sites')}
          className="map-segment"
        >
          <IonSegmentButton value="sites">
            <IonLabel>Sites</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="kafela" disabled={!kafela}>
            <IonLabel>My kafela</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {layer === 'sites' && (
          <IonSegment
            value={view}
            onIonChange={(e) => setView(e.detail.value as 'map' | 'list')}
            className="map-segment"
          >
            <IonSegmentButton value="map">
              <IonLabel>Map</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="list">
              <IonLabel>List</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        )}

        {layer === 'kafela' && kafela && (
          <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
            <IonSelect
              interface="popover"
              placeholder="All groups"
              value={groupFilter}
              onIonChange={(e) => setGroupFilter(String(e.detail.value ?? ''))}
            >
              <IonSelectOption value="">All groups</IonSelectOption>
              {groupOptions.map(([id, name]) => (
                <IonSelectOption key={id} value={id}>
                  {name}
                </IonSelectOption>
              ))}
            </IonSelect>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                staleOnly ? 'bg-amber-600 text-white' : 'bg-stitch-surface-low text-stitch-on-surface'
              }`}
              onClick={() => setStaleOnly((v) => !v)}
            >
              Not seen / sharing off
            </button>
            <span className="text-xs text-stitch-on-variant">
              {peopleWithCoords.length} on map · {filteredPeople.length} shown
            </span>
          </div>
        )}

        {layer === 'sites' && view === 'list' ? (
          <IonList lines="none" className="location-list">
            {locations.map((loc) => (
              <IonItem
                key={loc.id}
                button
                onClick={() => handleSelect(loc)}
                className="location-item"
              >
                <div className="location-icon-wrap" slot="start">
                  <IonIcon icon={locationOutline} />
                </div>
                <IonLabel>
                  <div className="location-name-row">
                    <h3>{loc.name}</h3>
                    <span className="location-arabic">{loc.nameArabic}</span>
                  </div>
                  <p className="location-desc">{loc.description}</p>
                </IonLabel>
                <IonIcon icon={navigateOutline} slot="end" color="primary" />
              </IonItem>
            ))}
          </IonList>
        ) : (
          <div className="map-container">
            {!kafela && layer === 'kafela' ? (
              <p className="p-5 text-sm text-stitch-on-variant">Join a kafela to see live locations.</p>
            ) : (
              <MapContainer
                center={mapCenter}
                zoom={layer === 'kafela' ? 14 : selected ? 15 : 12}
                className="leaflet-map"
                key={`${layer}-${selected?.id || 'default'}-${peopleWithCoords[0]?.memberId || 'p'}`}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {layer === 'sites' &&
                  locations.map((loc) => (
                    <Marker key={loc.id} position={[loc.latitude, loc.longitude]}>
                      <Popup>
                        <div className="map-popup">
                          <strong>{loc.name}</strong>
                          <span className="popup-arabic">{loc.nameArabic}</span>
                          <p>{loc.description}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                {layer === 'kafela' &&
                  peopleWithCoords.map((p) => {
                    const loc = p.location!;
                    const color = p.group?.color || '#13423d';
                    const opacity = loc.stale ? 0.45 : 0.9;
                    return (
                      <CircleMarker
                        key={p.memberId}
                        center={[loc.latitude, loc.longitude]}
                        radius={p.isSelf ? 10 : 8}
                        pathOptions={{
                          color,
                          fillColor: color,
                          fillOpacity: opacity,
                          opacity,
                          weight: p.isSelf ? 3 : 2,
                        }}
                      >
                        <Popup>
                          <div className="map-popup">
                            <strong>
                              {p.displayName}
                              {p.isSelf ? ' (you)' : ''}
                            </strong>
                            <p>
                              {p.group?.name || 'Ungrouped'} · {formatAge(loc.ageMs)}
                              {loc.stale ? ' · stale' : ''}
                            </p>
                            {p.phone && (
                              <p>
                                <a href={`tel:${p.phone}`}>Call</a>
                              </p>
                            )}
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
              </MapContainer>
            )}
          </div>
        )}

        {layer === 'kafela' && kafela && (
          <IonList lines="none" className="location-list">
            {filteredPeople.map((p) => (
              <IonItem key={p.memberId} className="location-item">
                <div
                  className="location-icon-wrap"
                  slot="start"
                  style={{ background: p.group?.color || '#13423d', color: '#fff' }}
                >
                  {p.displayName.slice(0, 1).toUpperCase()}
                </div>
                <IonLabel>
                  <h3>
                    {p.displayName}
                    {p.isSelf ? ' (you)' : ''}
                  </h3>
                  <p className="location-desc">
                    {p.group?.name || 'Ungrouped'}
                    {!p.sharingEnabled
                      ? ' · sharing off'
                      : p.location
                        ? ` · ${formatAge(p.location.ageMs)}${p.location.stale ? ' (stale)' : ''}`
                        : ' · no fix yet'}
                  </p>
                </IonLabel>
                {p.phone && (
                  <a slot="end" href={`tel:${p.phone}`} className="text-sm font-semibold text-stitch-primary">
                    Call
                  </a>
                )}
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default MapPage;
