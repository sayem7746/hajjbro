import React from 'react';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonBackButton,
  IonAvatar,
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useAuth } from '../contexts/AuthContext';

type AppHeaderProps = {
  title: string;
  showBack?: boolean;
  defaultHref?: string;
  backText?: string;
};

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack = false,
  defaultHref = '/app/home',
  backText,
}) => {
  const router = useIonRouter();
  const { user } = useAuth();
  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? 'G';

  const onProfile = () => {
    router.push('/app/progress', 'forward', 'push');
  };

  return (
    <IonHeader className="ion-no-border shadow-none">
      <IonToolbar className="hajj-glass-toolbar min-h-[52px] px-1 [--border-width:0]">
        <IonButtons slot="start">
          {showBack ? (
            <IonBackButton
              defaultHref={defaultHref}
              text={backText}
              className="min-h-touch min-w-touch text-ink"
            />
          ) : (
            <div className="min-h-touch min-w-touch shrink-0" aria-hidden />
          )}
        </IonButtons>
        <IonTitle
          className={`font-sans tracking-tight text-stitch-on-surface ${
            title === 'HajjBro' ? 'text-[1.05rem] font-bold' : 'text-[0.95rem] font-semibold'
          }`}
        >
          {title}
        </IonTitle>
        <IonButtons slot="end">
          <IonButton
            fill="clear"
            className="min-h-touch min-w-touch"
            onClick={onProfile}
            aria-label="Open journey and progress"
          >
            <IonAvatar className="h-9 w-9 border border-border-soft bg-surface text-sm font-semibold text-brand">
              {initial}
            </IonAvatar>
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
  );
};

export default AppHeader;
