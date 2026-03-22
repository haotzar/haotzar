import { useState } from 'react';
import {
  NumberSymbolRegular,
  BookOpenRegular,
  BookRegular,
  CalendarLtrRegular,
  ScalesRegular,
  NoteRegular,
  ChevronRightRegular,
  ChevronLeftRegular,
} from '@fluentui/react-icons';
import GematriaTool from './GematriaTool';
import HebrewCalendarComponent from './HebrewCalendar';
import UnitConverter from './UnitConverter';
import AramaicDictionary from './AramaicDictionary';
import PersonalNotes from './PersonalNotes';
import ParashaTool from './ParashaTool';
import './ToolsPage.css';

const ToolsPage = ({ initialTool = 'gematria' }) => {
  // קריאת הכלי האחרון מ-localStorage או שימוש ב-initialTool
  const getLastActiveTool = () => {
    // אם initialTool הועבר במפורש (לא ברירת המחדל), השתמש בו
    if (initialTool !== 'gematria') {
      return initialTool;
    }
    
    // אחרת, נסה לקרוא מ-localStorage
    try {
      const savedTool = localStorage.getItem('lastActiveTool');
      return savedTool || initialTool;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialTool;
    }
  };

  const [activeTool, setActiveTool] = useState(getLastActiveTool());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateInfo, setSelectedDateInfo] = useState(null);
  const [currentMonth, setCurrentMonth] = useState('');
  const [calendarNavigation, setCalendarNavigation] = useState({ prev: null, next: null });

  // שמירת הכלי הפעיל ב-localStorage בכל פעם שהוא משתנה
  const handleToolChange = (toolId) => {
    setActiveTool(toolId);
    try {
      localStorage.setItem('lastActiveTool', toolId);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const handleDateSelect = (date, info) => {
    setSelectedDate(date);
    setSelectedDateInfo(info);
  };

  const handleMonthChange = (month, prevFunc, nextFunc) => {
    setCurrentMonth(month);
    setCalendarNavigation({ prev: prevFunc, next: nextFunc });
  };

  const tools = [
    { id: 'gematria', name: 'גימטריות', icon: NumberSymbolRegular },
    { id: 'parasha', name: 'פרשת שבוע', icon: BookOpenRegular },
    { id: 'dictionary', name: 'מילון ארמי-עברי', icon: BookRegular },
    { id: 'calendar', name: 'לוח שנה', icon: CalendarLtrRegular },
    { id: 'converter', name: 'ממיר מידות', icon: ScalesRegular },
    { id: 'notes', name: 'הערות אישיות', icon: NoteRegular },
  ];

  const renderToolContent = () => {
    switch (activeTool) {
      case 'gematria':
        return <GematriaTool />;
      case 'parasha':
        return <ParashaTool />;
      case 'dictionary':
        return <AramaicDictionary />;
      case 'calendar':
        return (
          <div className="tool-content">
            <div className="tool-header-with-card">
              {selectedDateInfo && (
                <div className="selected-date-card-header">
                  {selectedDateInfo.holidays && selectedDateInfo.holidays.length > 0 && (
                    <>
                      <div className="selected-date-holiday">
                        {selectedDateInfo.holidays[0].render('he')}
                      </div>
                      <div className="selected-date-divider"></div>
                    </>
                  )}
                  <div className="selected-date-info">
                    <div className="selected-date-main">
                      {selectedDateInfo.dayOfWeek} {selectedDateInfo.gematriya} {selectedDateInfo.month}
                    </div>
                    <div className="selected-date-gregorian">
                      {selectedDate.toLocaleDateString('he-IL', { 
                        day: 'numeric', 
                        month: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              )}
              {currentMonth && (
                <div className="current-month-container">
                  <button className="month-nav-btn" onClick={calendarNavigation.next} title="חודש הבא">
                    <ChevronLeftRegular />
                  </button>
                  <div className="current-month-display">
                    {currentMonth}
                  </div>
                  <button className="month-nav-btn" onClick={calendarNavigation.prev} title="חודש קודם">
                    <ChevronRightRegular />
                  </button>
                </div>
              )}
              <div className="tool-header-text">
                <h2>לוח שנה עברי</h2>
                <p>לוח שנה עברי ולועזי משולב עם חגים ומועדים</p>
              </div>
            </div>
            <HebrewCalendarComponent onDateSelect={handleDateSelect} onMonthChange={handleMonthChange} />
          </div>
        );
      case 'converter':
        return (
          <div className="tool-content">
            <h2>ממיר מידות</h2>
            <p>המרת מידות הלכתיות - אורך, נפח ומשקל</p>
            <UnitConverter />
          </div>
        );
      case 'notes':
        return (
          <div className="tool-content">
            <h2>הערות אישיות</h2>
            <p>ניהול הערות והארות אישיות על ספרים ועמודים</p>
            <PersonalNotes />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="tools-page">
      {/* רקע */}
      <div className="tools-bg"></div>

      {/* תוכן */}
      <div className="tools-content">
        {/* מיכל ראשי */}
        <div className="tools-main-container">
          {/* תוכן הכלי - צד שמאל */}
          <div className="tools-content-area">
            {renderToolContent()}
          </div>

          {/* תוכן עניינים - צד ימין */}
          <div className="tools-toc">
            <div className="toc-header">
              <h3>כלים</h3>
            </div>
            <div className="toc-list">
              {tools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <button
                    key={tool.id}
                    className={`toc-item ${activeTool === tool.id ? 'active' : ''}`}
                    onClick={() => handleToolChange(tool.id)}
                  >
                    <IconComponent className="toc-icon" />
                    <span className="toc-name">{tool.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsPage;
