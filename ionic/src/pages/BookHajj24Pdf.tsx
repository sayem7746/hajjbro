import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonSpinner,
  IonIcon,
} from '@ionic/react';
import { arrowBackOutline, openOutline } from 'ionicons/icons';
import { BOOK_HAJJ_24_PDF_URL } from '../config/pdfAssets';
import './BookHajj24Pdf.css';

const BookHajj24Pdf: React.FC = () => {
  const [loaded, setLoaded] = useState(false);
  const history = useHistory();

  const backToGuide = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.push('/app/guide');
    }
  };

  const openInSystemViewer = () => {
    window.open(BOOK_HAJJ_24_PDF_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <IonPage className="book-hajj24-pdf-page">
      <IonHeader className="book-hajj24-pdf-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={backToGuide} aria-label="Back to Book Hajj 24 guide">
              <IonIcon slot="start" icon={arrowBackOutline} />
              Guide
            </IonButton>
          </IonButtons>
          <IonTitle>Booklet (PDF)</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={openInSystemViewer} aria-label="Open PDF in browser">
              <IonIcon icon={openOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false} className="book-hajj24-pdf-content">
        <div className="book-hajj24-pdf-outer">
          <div className="book-hajj24-pdf-chrome">
            <IonButton size="small" fill="solid" color="primary" onClick={backToGuide} className="book-hajj24-pdf-chrome-btn">
              <IonIcon slot="start" icon={arrowBackOutline} />
              Back to guide
            </IonButton>
          </div>
          <div className="book-hajj24-pdf-wrap">
          {!loaded && (
            <div className="book-hajj24-pdf-loading">
              <IonSpinner name="crescent" />
              <p>Loading PDF…</p>
            </div>
          )}
          <iframe
            title="Book Hajj 24 — PDF"
            src={BOOK_HAJJ_24_PDF_URL}
            onLoad={() => setLoaded(true)}
            className="book-hajj24-pdf-frame"
          />
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default BookHajj24Pdf;
