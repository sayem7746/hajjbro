import React from 'react';
import { Redirect, Route } from 'react-router-dom';
import { IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonLabel } from '@ionic/react';
import { Home, BookOpen, CheckSquare, MapPinned, Clock } from 'lucide-react';

import HomePage from '../pages/Home';
import RitualList from '../pages/RitualList';
import RitualDetail from '../pages/RitualDetail';
import Progress from '../pages/Progress';
import Checklist from '../pages/Checklist';
import MapPage from '../pages/Map';
import PrayerTimesPage from '../pages/PrayerTimes';
import Weather from '../pages/Weather';
import BookHajj24 from '../pages/BookHajj24';
import BookHajj24Pdf from '../pages/BookHajj24Pdf';

const tabIconClass = 'tab-icon';

const AppTabs: React.FC = () => {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/app/home" component={HomePage} />
        <Route exact path="/app/rituals" component={RitualList} />
        <Route exact path="/app/rituals/:id" component={RitualDetail} />
        <Route exact path="/app/progress" component={Progress} />
        <Route exact path="/app/checklist" component={Checklist} />
        <Route exact path="/app/map" component={MapPage} />
        <Route exact path="/app/prayers" component={PrayerTimesPage} />
        <Route exact path="/app/weather" component={Weather} />
        <Route exact path="/app/guide" component={BookHajj24} />
        <Route exact path="/app/guide/pdf" component={BookHajj24Pdf} />
        <Route exact path="/app">
          <Redirect to="/app/home" />
        </Route>
      </IonRouterOutlet>

      <IonTabBar slot="bottom" className="hajj-tab-bar">
        <IonTabButton tab="home" href="/app/home" className="hajj-tab-btn">
          <Home className={tabIconClass} size={22} strokeWidth={1.75} aria-hidden />
          <IonLabel>Home</IonLabel>
        </IonTabButton>
        <IonTabButton tab="rituals" href="/app/rituals" className="hajj-tab-btn">
          <BookOpen className={tabIconClass} size={22} strokeWidth={1.75} aria-hidden />
          <IonLabel>Rituals</IonLabel>
        </IonTabButton>
        <IonTabButton tab="checklist" href="/app/checklist" className="hajj-tab-btn">
          <CheckSquare className={tabIconClass} size={22} strokeWidth={1.75} aria-hidden />
          <IonLabel>Checklist</IonLabel>
        </IonTabButton>
        <IonTabButton tab="map" href="/app/map" className="hajj-tab-btn">
          <MapPinned className={tabIconClass} size={22} strokeWidth={1.75} aria-hidden />
          <IonLabel>Map</IonLabel>
        </IonTabButton>
        <IonTabButton tab="prayers" href="/app/prayers" className="hajj-tab-btn">
          <Clock className={tabIconClass} size={22} strokeWidth={1.75} aria-hidden />
          <IonLabel>Prayers</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
};

export default AppTabs;
