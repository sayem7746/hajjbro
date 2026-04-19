import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonAccordionGroup,
  IonAccordion,
  IonLabel,
  IonChip,
  IonItem,
  IonButton,
  IonIcon,
} from '@ionic/react';
import { documentTextOutline } from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { bookHajj24Meta, bookHajj24Sections } from '../data/bookHajj24';
import { rituals } from '../data/rituals';
import './BookHajj24.css';

const BookHajj24: React.FC = () => {
  const history = useHistory();
  const location = useLocation();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [openSections, setOpenSections] = useState<string[]>(() => {
    const s = new URLSearchParams(window.location.search).get('section');
    return s ? [s] : [];
  });

  useEffect(() => {
    const s = searchParams.get('section');
    if (!s) return;
    setOpenSections((prev) => (prev.includes(s) ? prev : [...prev, s]));
  }, [searchParams]);

  const onAccordionChange = useCallback((e: CustomEvent<{ value: string | string[] | null }>) => {
    const v = e.detail.value;
    if (v == null || v === '') {
      setOpenSections([]);
      return;
    }
    setOpenSections(Array.isArray(v) ? v : [v]);
  }, []);

  const ritualTitle = (id: string) => rituals.find((r) => r.id === id)?.title ?? id;

  const openRitualFromSection = (sectionId: string, ritualId: string) => {
    history.replace({ pathname: '/app/guide', search: `?section=${encodeURIComponent(sectionId)}` });
    history.push({ pathname: `/app/rituals/${ritualId}`, state: { fromBookHajjSection: true } });
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="hajj-glass-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/home" text="Home" />
          </IonButtons>
          <IonTitle className="text-stitch-on-surface">{bookHajj24Meta.title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="sanctuary-content book-hajj24-content">
        <IonCard className="book-hajj24-intro">
          <IonCardHeader>
            <IonCardTitle>{bookHajj24Meta.subtitle}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p className="book-hajj24-lead">
              {bookHajj24Meta.pages}-page booklet overview, aligned with your rituals and locations in HajjBro.
            </p>
            <p className="book-hajj24-meta">{bookHajj24Meta.sourceNote}</p>
          </IonCardContent>
        </IonCard>

        <IonCard className="book-hajj24-pdf-card">
          <IonCardHeader>
            <div className="book-hajj24-pdf-card-head">
              <div className="book-hajj24-pdf-icon-wrap" aria-hidden>
                <IonIcon icon={documentTextOutline} />
              </div>
              <div>
                <IonCardTitle>Original booklet (PDF)</IonCardTitle>
                <p className="book-hajj24-pdf-blurb">
                  Read the full {bookHajj24Meta.pages}-page Bangla booklet in the in-app viewer (pinch-zoom and scroll). Use the toolbar action if your device opens PDFs better in the system browser.
                </p>
              </div>
            </div>
          </IonCardHeader>
          <IonCardContent>
            <IonButton expand="block" color="primary" routerLink="/app/guide/pdf">
              Open PDF reader
            </IonButton>
          </IonCardContent>
        </IonCard>

        <IonAccordionGroup
          multiple
          className="book-hajj24-accordions"
          value={openSections}
          onIonChange={onAccordionChange}
        >
          {bookHajj24Sections.map((section) => (
            <IonAccordion key={section.id} value={section.id} className="book-hajj24-accordion">
              <IonItem slot="header" lines="none" className="book-hajj24-acc-header">
                <IonLabel className="book-hajj24-acc-title">{section.title}</IonLabel>
              </IonItem>
              <div slot="content" className="book-hajj24-acc-body">
                {section.paragraphs.map((p, i) => (
                  <p key={i} className="book-hajj24-p">
                    {p}
                  </p>
                ))}
                {section.relatedRitualIds && section.relatedRitualIds.length > 0 && (
                  <div className="book-hajj24-related">
                    <span className="book-hajj24-related-label">In HajjBro</span>
                    <div className="book-hajj24-chips">
                      {section.relatedRitualIds.map((rid) => (
                        <IonChip
                          key={rid}
                          outline
                          color="primary"
                          onClick={() => openRitualFromSection(section.id, rid)}
                        >
                          <IonLabel>{ritualTitle(rid)}</IonLabel>
                        </IonChip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </IonAccordion>
          ))}
        </IonAccordionGroup>

        <div className="book-hajj24-footer-spacer" />
      </IonContent>
    </IonPage>
  );
};

export default BookHajj24;
