import React, { useMemo } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonIcon,
  IonProgressBar,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { useOfflineChecklist } from '../hooks/useOfflineData';
import { useProgress } from '../contexts/ProgressContext';
import { categoryLabels, categoryIcons } from '../data/checklist';
import { ChecklistItem } from '../types';
import './Checklist.css';

const Checklist: React.FC = () => {
  const { checklist } = useOfflineChecklist();
  const { isChecklistItemComplete, toggleChecklistItem, totalChecklistComplete } = useProgress();

  const categories = useMemo(() => {
    const grouped: Record<string, ChecklistItem[]> = {};
    checklist.forEach((item) => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return grouped;
  }, [checklist]);

  const totalItems = checklist.length;
  const progressValue = totalItems > 0 ? totalChecklistComplete / totalItems : 0;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Checklist</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Checklist</IonTitle>
          </IonToolbar>
        </IonHeader>

        <div className="checklist-summary">
          <div className="checklist-progress-info">
            <span className="checklist-count">
              {totalChecklistComplete} / {totalItems} items
            </span>
            <span className="checklist-percent">
              {Math.round(progressValue * 100)}%
            </span>
          </div>
          <IonProgressBar value={progressValue} className="checklist-bar" />
        </div>

        {Object.entries(categories).map(([category, items]) => {
          const catKey = category as ChecklistItem['category'];
          const completedInCat = items.filter((i) => isChecklistItemComplete(i.id)).length;

          return (
            <div key={category} className="checklist-category">
              <div className="category-header">
                <div className="category-header-left">
                  <IonIcon
                    icon={(categoryIcons as Record<string, string>)[catKey]}
                    className="category-icon"
                  />
                  <span className="category-title">
                    {(categoryLabels as Record<string, string>)[catKey]}
                  </span>
                </div>
                <span className="category-count">
                  {completedInCat}/{items.length}
                </span>
              </div>

              <IonCard className="checklist-card">
                <IonCardContent className="checklist-card-content">
                  <IonList lines="none">
                    {items.map((item) => {
                      const checked = isChecklistItemComplete(item.id);
                      return (
                        <IonItem
                          key={item.id}
                          className={`checklist-item ${checked ? 'checked' : ''}`}
                          button
                          onClick={() => toggleChecklistItem(item.id)}
                        >
                          <IonCheckbox
                            slot="start"
                            checked={checked}
                            className="checklist-checkbox"
                          />
                          <IonLabel className={checked ? 'label-checked' : ''}>
                            {item.label}
                          </IonLabel>
                        </IonItem>
                      );
                    })}
                  </IonList>
                </IonCardContent>
              </IonCard>
            </div>
          );
        })}

        <div style={{ height: 32 }} />
      </IonContent>
    </IonPage>
  );
};

export default Checklist;
