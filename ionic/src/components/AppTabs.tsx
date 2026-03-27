import React from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonTabs,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/react';
import {
  homeOutline,
  bookOutline,
  checkboxOutline,
  mapOutline,
  timeOutline,
} from 'ionicons/icons';

import Home from '../pages/Home';
import RitualList from '../pages/RitualList';
import RitualDetail from '../pages/RitualDetail';
import Progress from '../pages/Progress';
import Checklist from '../pages/Checklist';
import MapPage from '../pages/Map';
import PrayerTimesPage from '../pages/PrayerTimes';
import Weather from '../pages/Weather';

const AppTabs: React.FC = () => {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/app/home" component={Home} />
        <Route exact path="/app/rituals" component={RitualList} />
        <Route exact path="/app/rituals/:id" component={RitualDetail} />
        <Route exact path="/app/progress" component={Progress} />
        <Route exact path="/app/checklist" component={Checklist} />
        <Route exact path="/app/map" component={MapPage} />
        <Route exact path="/app/prayers" component={PrayerTimesPage} />
        <Route exact path="/app/weather" component={Weather} />
        <Route exact path="/app">
          <Redirect to="/app/home" />
        </Route>
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        <IonTabButton tab="home" href="/app/home">
          <IonIcon icon={homeOutline} />
          <IonLabel>Home</IonLabel>
        </IonTabButton>
        <IonTabButton tab="rituals" href="/app/rituals">
          <IonIcon icon={bookOutline} />
          <IonLabel>Rituals</IonLabel>
        </IonTabButton>
        <IonTabButton tab="checklist" href="/app/checklist">
          <IonIcon icon={checkboxOutline} />
          <IonLabel>Checklist</IonLabel>
        </IonTabButton>
        <IonTabButton tab="map" href="/app/map">
          <IonIcon icon={mapOutline} />
          <IonLabel>Map</IonLabel>
        </IonTabButton>
        <IonTabButton tab="prayers" href="/app/prayers">
          <IonIcon icon={timeOutline} />
          <IonLabel>Prayers</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
};

export default AppTabs;
