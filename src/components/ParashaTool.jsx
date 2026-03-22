import { useState } from 'react';
import { 
  BookOpenRegular, 
  CalendarLtrRegular,
  DocumentTextRegular,
  ChevronRightRegular
} from '@fluentui/react-icons';
import './ParashaTool.css';

const ParashaTool = () => {
  const [activeTab, setActiveTab] = useState('tikun');

  const tabs = [
    { id: 'tikun', name: 'תיקון קוראים', icon: BookOpenRegular },
    { id: 'shnayim', name: 'שניים מקרא', icon: DocumentTextRegular },
    { id: 'commentary', name: 'על הפרשה', icon: CalendarLtrRegular }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tikun':
        return (
          <div className="tab-content">
            <div className="content-placeholder">
              <BookOpenRegular className="placeholder-icon" />
              <h3>תיקון קוראים</h3>
              <p>כלי לתרגול קריאה בתורה עם טעמים ונקודות</p>
              <div className="placeholder-features">
                <div className="feature-item">
                  <ChevronRightRegular />
                  <span>טקסט עם טעמים ונקודות</span>
                </div>
                <div className="feature-item">
                  <ChevronRightRegular />
                  <span>אפשרות להסתרת נקודות</span>
                </div>
                <div className="feature-item">
                  <ChevronRightRegular />
                  <span>חלוקה לעליות</span>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'shnayim':
        return (
          <div className="tab-content">
            <div className="content-placeholder">
              <DocumentTextRegular className="placeholder-icon" />
              <h3>שניים מקרא ואחד תרגום</h3>
              <p>לימוד הפרשה עם תרגום אונקלוס</p>
              <div className="placeholder-features">
                <div className="feature-item">
                  <ChevronRightRegular />
                  <span>פסוק בעברית</span>
                </div>
                <div className="feature-item">
                  <ChevronRightRegular />
                  <span>תרגום אונקלוס</span>
                </div>
                <div className="feature-item">
                  <ChevronRightRegular />
                  <span>מעקב אחר התקדמות</span>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'commentary':
        return (
          <div className="tab-content">
            <div className="content-placeholder">
              <CalendarLtrRegular className="placeholder-icon" />
              <h3>פירושים על הפרשה</h3>
              <p>פירושי רש"י, רמב"ן ועוד על פרשת השבוע</p>
              <div className="placeholder-features">
                <div className="feature-item">
                  <ChevronRightRegular />
                  <span>רש"י על התורה</span>
                </div>
                <div className="feature-item">
                  <ChevronRightRegular />
                  <span>רמב"ן</span>
                </div>
                <div className="feature-item">
                  <ChevronRightRegular />
                  <span>אור החיים</span>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="parasha-tool">
      {/* כותרת */}
      <div className="tool-header">
        <h2>פרשת השבוע</h2>
        <p>כלים ללימוד פרשת השבוע - תיקון קוראים, שניים מקרא ופירושים</p>
      </div>

      {/* טאבים */}
      <div className="parasha-tabs">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <IconComponent className="tab-icon" />
              <span className="tab-name">{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* תוכן הטאב */}
      <div className="parasha-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ParashaTool;
