import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react';
import { locationOutline, navigateOutline } from 'ionicons/icons';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useOfflineLocations } from '../hooks/useOfflineData';
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

const MapPage: React.FC = () => {
  const { locations } = useOfflineLocations();
  const [view, setView] = useState<'map' | 'list'>('map');
  const [selected, setSelected] = useState<HajjLocation | null>(null);

  const handleSelect = (loc: HajjLocation) => {
    setSelected(loc);
    setView('map');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Hajj Locations</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
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

        {view === 'map' ? (
          <div className="map-container">
            <MapContainer
              center={selected ? [selected.latitude, selected.longitude] : MAKKAH_CENTER}
              zoom={selected ? 15 : 12}
              className="leaflet-map"
              key={selected?.id || 'default'}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {locations.map((loc) => (
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
            </MapContainer>
          </div>
        ) : (
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
        )}
      </IonContent>
    </IonPage>
  );
};

export default MapPage;
