import { 
  SearchRegular,
  LibraryRegular,
  BookRegular,
  BriefcaseRegular,
  TagRegular,
  ClockRegular,
  WeatherSunnyRegular,
  WeatherMoonRegular,
  CalendarRegular,
  QuestionCircleRegular,
  DocumentRegular,
  SettingsRegular,
  ShieldCheckmarkRegular,
  AddRegular
} from '@fluentui/react-icons';
import { useState, useEffect } from 'react';
import Bookshelf from './Bookshelf';
import FileTree from './FileTree';
import BookPreview from './BookPreview';
import RecentBooks from './RecentBooks';
import Workspaces from './Workspaces';
import { getZmanimInfo, getDafYomiDetails } from '../utils/hebrewCalendar';
import './LibraryHome.css';

const LibraryHome = ({ 
  recentBooks, 
  allFiles, 
  onBookClick,
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
  onRenameWorkspace,
  onOpenCalendar,
  onOpenParasha
}) => {
  const [previewBook, setPreviewBook] = useState(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [zmanimInfo, setZmanimInfo] = useState(getZmanimInfo());

  // Update zmanim info every minute
  useEffect(() => {
    const updateZmanim = () => {
      setZmanimInfo(getZmanimInfo());
    };
    
    // Update immediately
    updateZmanim();
    
    // Update every minute
    const interval = setInterval(updateZmanim, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // פתיחת ספר בתצוגה מקדימה
  const handleBookPreview = (book) => {
    setPreviewBook(book);
  };

  // סגירת תצוגה מקדימה
  const handleClosePreview = () => {
    setPreviewBook(null);
  };

  // פתיחה/סגירה של הספרייה
  const toggleLibrary = () => {
    setShowLibrary(!showLibrary);
  };

  // פתיחה/סגירה של נושאים
  const toggleTopics = () => {
    setShowTopics(!showTopics);
  };

  // פתיחה/סגירה של עזרה
  const toggleHelp = (section) => {
    setShowHelp(section || !showHelp);
  };
  
  // יצירת שולחן עבודה חדש
  const handleCreateWorkspace = () => {
    // מצא את המספר הבא לשולחן עבודה
    const workspaceNumbers = workspaces
      .map(w => {
        const match = w.name.match(/^שולחן עבודה (\d+)$/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => n > 0);
    
    const nextNumber = workspaceNumbers.length > 0 ? Math.max(...workspaceNumbers) + 1 : 1;
    const name = `שולחן עבודה ${nextNumber}`;
    
    onCreateWorkspace(name);
  };

  // פתיחת דף היומי
  const handleDafYomiClick = async () => {
    const dafYomiDetails = getDafYomiDetails();
    
    if (!dafYomiDetails) {
      console.error('Could not get Daf Yomi details');
      return;
    }

    const { masechta, daf } = dafYomiDetails;
    console.log('🔍 Opening Daf Yomi:', { masechta, daf });
    
    // חיפוש מדויק של הספר לפי שם המסכת
    const masechtaBook = allFiles.find(file => {
      const fileName = file.name.toLowerCase().trim();
      const masechtaLower = masechta.toLowerCase().trim();
      
      // התאמה מדויקת: שם הקובץ צריך להיות בדיוק שם המסכת (ללא .pdf)
      const fileNameWithoutExt = fileName.replace(/\.pdf$/i, '').replace(/\.txt$/i, '');
      
      // בדיקה מדויקת
      return fileNameWithoutExt === masechtaLower;
    });

    if (masechtaBook) {
      console.log('📖 Found book:', masechtaBook.name);
      
      // נסה לחפש את הדף בתוכן העניינים
      const booksMetadata = (await import('../utils/booksMetadata.js')).default;
      
      // חפש בתוכן עניינים
      const tocEntry = booksMetadata.searchTableOfContents(masechtaBook.name, `דף ${daf}`);
      
      if (tocEntry && tocEntry.page) {
        console.log('📖 Found in TOC:', tocEntry);
        // פתח בעמוד המדויק מתוכן העניינים
        onBookClick(masechtaBook, { 
          context: { pageNum: tocEntry.page },
          searchQuery: daf, // חפש רק את מספר הדף
          outlineSearch: `דף ${daf}` // חיפוש בתוכן עניינים של PDF
        });
      } else {
        console.log('📖 Not found in TOC, searching in PDF outline');
        // אם לא נמצא בתוכן עניינים, פתח עם חיפוש בתוכן עניינים של PDF
        onBookClick(masechtaBook, { 
          searchQuery: daf, // חפש רק את מספר הדף (יותר גמיש)
          outlineSearch: `דף ${daf}` // חיפוש בתוכן עניינים של PDF
        });
      }
    } else {
      console.warn(`Could not find book for masechta: ${masechta}`);
      console.log('📚 Searching in files:', allFiles.filter(f => f.name.includes('שס')).map(f => f.name));
      alert(`לא נמצא ספר למסכת ${masechta}\nנסה לחפש את הספר ידנית בספרייה.`);
    }
  };
  // סינון ספרים לפי קטגוריות
  const getTanachBooks = () => {
    return allFiles.filter(file => 
      file.name.includes('תנך') || 
      file.name.includes('תורה') || 
      file.name.includes('נביאים') ||
      file.name.includes('כתובים') ||
      file.name.includes('בראשית') ||
      file.name.includes('שמות')
    ).slice(0, 8);
  };

  const getShasBooks = () => {
    return allFiles.filter(file => 
      file.name.includes('מסכת') || 
      file.name.includes('ברכות') ||
      file.name.includes('שבת') ||
      file.name.includes('גמרא')
    ).slice(0, 8);
  };

  const getHalachaBooks = () => {
    return allFiles.filter(file => 
      file.name.includes('הלכה') || 
      file.name.includes('שולחן ערוך') ||
      file.name.includes('משנה ברורה') ||
      file.name.includes('רמבם')
    ).slice(0, 8);
  };

  const getMachshavaBooks = () => {
    return allFiles.filter(file => 
      file.name.includes('מחשבה') || 
      file.name.includes('מוסר') ||
      file.name.includes('חסידות') ||
      file.name.includes('קבלה')
    ).slice(0, 8);
  };

  return (
    <div className="library-home">
      {/* רקע */}
      <div className="library-bg"></div>
      
      {/* סמלים מרחפים ברקע */}
      <div className="floating-icons">
        {[...Array(15)].map((_, i) => (
          <img 
            key={i} 
            src="/icon.png" 
            alt="" 
            className={`floating-icon floating-icon-${i + 1}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${6 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
      
      {/* תוכן */}
      <div className="library-content">
        {/* טור עזרה - צד שמאל */}
        <div className="help-sidebar">
          <div className="help-sidebar-top">
            <div className="help-sidebar-header">
              <h3>עזרה</h3>
              <QuestionCircleRegular className="help-sidebar-icon" />
            </div>
            
            <div className="help-cards-list">
              <div className="help-card" onClick={() => toggleHelp('start')}>
                <QuestionCircleRegular className="help-card-icon" />
                <div className="help-card-title">איך מתחילים</div>
              </div>
              
              <div className="help-card" onClick={() => toggleHelp('search')}>
                <SearchRegular className="help-card-icon" />
                <div className="help-card-title">חיפוש במאגר</div>
              </div>
              
              <div className="help-card" onClick={() => toggleHelp('library')}>
                <LibraryRegular className="help-card-icon" />
                <div className="help-card-title">ניהול הספרייה</div>
              </div>
              
              <div className="help-card" onClick={() => toggleHelp('terms')}>
                <ShieldCheckmarkRegular className="help-card-icon" />
                <div className="help-card-title">תנאי שימוש</div>
              </div>
            </div>
          </div>
          
          <div className="zmanim-footer-info" onClick={onOpenCalendar} style={{ cursor: 'pointer' }} title="לחץ לפתיחת לוח השנה">
            <CalendarRegular className="footer-icon" />
            <div className="footer-text">
              <span>{zmanimInfo.hebrewDate}</span>
              <span>
                {zmanimInfo.parsha}
                {zmanimInfo.dafYomi && zmanimInfo.parsha && ' • '}
                {zmanimInfo.dafYomi}
              </span>
            </div>
          </div>
        </div>

        {/* כותרת */}
        <div className="library-header">
          <h1 className="library-title">האויצר</h1>
          <p className="library-subtitle">ספרייה דיגיטלית של ספרי קודש</p>
          <p className="library-description">מאגר חינמי ענק של מאות אלפי ספרים וטקסטים</p>
        </div>

        {/* אזור מרכזי */}
        <div className="library-center-content">
          {/* כרטיסי פעולות */}
          <div className="action-cards-container">
            <div className="action-card" onClick={toggleLibrary}>
              <LibraryRegular className="action-card-icon" />
              <div className="action-card-title">ספרייה</div>
            </div>

            <div className="action-card" onClick={handleDafYomiClick}>
              <BookRegular className="action-card-icon" />
              <div className="action-card-title">דף היומי</div>
            </div>

            <div className="action-card" onClick={onOpenParasha}>
              <BookRegular className="action-card-icon" />
              <div className="action-card-title">פרשת השבוע</div>
            </div>

            <div className="action-card" onClick={toggleTopics}>
              <TagRegular className="action-card-icon" />
              <div className="action-card-title">נושאים</div>
            </div>
          </div>
        </div>

        {/* טור שולחנות עבודה - צד ימין */}
        <div className="workspaces-sidebar">
          <div className="workspaces-sidebar-header">
            <h3>שולחנות עבודה</h3>
            <button
              className="workspace-add-sidebar-btn"
              onClick={handleCreateWorkspace}
              title="צור שולחן עבודה חדש"
            >
              <AddRegular />
            </button>
          </div>
          
          <div className="workspaces-sidebar-content">
            <Workspaces
              workspaces={workspaces}
              currentWorkspace={currentWorkspace}
              onSelectWorkspace={onSelectWorkspace}
              onCreateWorkspace={onCreateWorkspace}
              onDeleteWorkspace={onDeleteWorkspace}
              onRenameWorkspace={onRenameWorkspace}
            />
          </div>
        </div>
      </div>

      {/* דיאלוג ספרייה */}
      {showLibrary && (
        <div className="library-dialog-overlay" onClick={toggleLibrary}>
          <div className="library-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="library-dialog-header">
              <h2>ספרייה</h2>
              <button className="library-dialog-close" onClick={toggleLibrary}>
                ✕
              </button>
            </div>
            <div className="library-dialog-content">
              <FileTree 
                files={allFiles}
                onFileClick={(file) => {
                  onBookClick(file);
                  toggleLibrary();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* דיאלוג נושאים */}
      {showTopics && (
        <div className="library-dialog-overlay" onClick={toggleTopics}>
          <div className="library-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="library-dialog-header">
              <h2>נושאים</h2>
              <button className="library-dialog-close" onClick={toggleTopics}>
                ✕
              </button>
            </div>
            <div className="library-dialog-content">
              <div className="empty-state">
                <TagRegular className="empty-state-icon" />
                <p className="empty-state-text">אין עדיין נושאים</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* דיאלוג עזרה */}
      {showHelp && (
        <div className="library-dialog-overlay" onClick={() => toggleHelp(false)}>
          <div className="library-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="library-dialog-header">
              <h2>
                {showHelp === 'start' && 'איך מתחילים'}
                {showHelp === 'search' && 'חיפוש במאגר'}
                {showHelp === 'library' && 'ניהול הספרייה'}
                {showHelp === 'terms' && 'תנאי שימוש'}
              </h2>
              <button className="library-dialog-close" onClick={() => toggleHelp(false)}>
                ✕
              </button>
            </div>
            <div className="library-dialog-content">
              <div className="help-content">
                {showHelp === 'start' && (
                  <div className="help-section">
                    <h3>ברוכים הבאים לאויצר!</h3>
                    <p>האויצר הוא מאגר דיגיטלי ענק של ספרי קודש, המאפשר לך לגשת למאות אלפי ספרים בקלות.</p>
                    
                    <h4>צעדים ראשונים:</h4>
                    <ol>
                      <li><strong>חיפוש:</strong> השתמש בשורת החיפוש למעלה כדי למצוא ספרים או נושאים</li>
                      <li><strong>ספרייה:</strong> לחץ על כרטיס "ספרייה" כדי לעיין בכל הספרים</li>
                      <li><strong>שולחנות עבודה:</strong> צור שולחנות עבודה שונים לניהול נוח יותר של כרטיסיות פתוחות</li>
                      <li><strong>דף היומי:</strong> גש במהירות לדף היומי הנוכחי</li>
                    </ol>
                    
                    <h4>טיפים שימושיים:</h4>
                    <ul>
                      <li>השתמש בחיפוש חכם למציאת מקורות מדויקים</li>
                      <li>הצמד ספרים שימושיים לסרגל הספריה</li>
                      <li>עבור בין מצב בהיר לכהה לפי העדפתך</li>
                    </ul>
                  </div>
                )}
                
                {showHelp === 'search' && (
                  <div className="help-section">
                    <h3>חיפוש במאגר</h3>
                    <p>מערכת החיפוש של האויצר מאפשרת לך למצוא בדיוק מה שאתה מחפש.</p>
                    
                    <h4>סוגי חיפוש:</h4>
                    <ul>
                      <li><strong>חיפוש טקסט:</strong> הקלד מילים או ביטויים לחיפוש בתוכן הספרים</li>
                      <li><strong>חיפוש לפי שם ספר:</strong> הקלד שם ספר למציאה מהירה</li>
                      <li><strong>חיפוש לפי מחבר:</strong> חפש ספרים לפי שם המחבר</li>
                      <li><strong>חיפוש לפי קטגוריה:</strong> עיין בספרים לפי נושא (תנ"ך, הלכה, מחשבה וכו')</li>
                    </ul>
                    
                    <h4>טיפים לחיפוש מוצלח:</h4>
                    <ul>
                      <li>השתמש במילים מדויקות לתוצאות טובות יותר</li>
                      <li>נסה וריאציות שונות של מילים</li>
                      <li>השתמש במרכאות לחיפוש ביטוי מדויק</li>
                      <li>סנן תוצאות לפי קטגוריות</li>
                    </ul>
                  </div>
                )}
                
                {showHelp === 'library' && (
                  <div className="help-section">
                    <h3>ניהול הספרייה</h3>
                    <p>ארגן את הספרים שלך בצורה יעילה עם כלי הניהול של האויצר.</p>
                    
                    <h4>שולחנות עבודה:</h4>
                    <ul>
                      <li><strong>יצירה:</strong> לחץ על כפתור + ליצירת שולחן עבודה חדש</li>
                      <li><strong>שינוי שם:</strong> לחץ לחיצה ימנית על שולחן עבודה לשינוי שם</li>
                      <li><strong>מחיקה:</strong> הסר שולחנות עבודה שאינך משתמש בהם</li>
                      <li><strong>מעבר:</strong> לחץ על שולחן עבודה למעבר אליו</li>
                    </ul>
                    
                    <h4>ארגון ספרים:</h4>
                    <ul>
                      <li>גרור ספרים לשולחנות עבודה שונים</li>
                      <li>צור שולחנות עבודה לפי נושאים</li>
                      <li>שמור ספרים שאתה משתמש בהם לעתים קרובות</li>
                    </ul>
                    
                    <h4>ספרים אחרונים:</h4>
                    <p>המערכת שומרת אוטומטית את הספרים האחרונים שפתחת לגישה מהירה.</p>
                  </div>
                )}
                
                {showHelp === 'terms' && (
                  <div className="help-section">
                    <h3>תנאי שימוש</h3>
                    
                    <h4>רישיון ושימוש:</h4>
                    <p>האויצר הוא תוכנה חינמית לשימוש אישי.</p>
                    
                    <h4>זכויות יוצרים:</h4>
                    <ul>
                      <li>כל הספרים במאגר מוגנים בזכויות יוצרים של בעליהם</li>
                      <li>השימוש בספרים מותר ללימוד אישי בלבד</li>
                      <li>אין להעתיק, להפיץ או למכור את הספרים</li>
                      <li>אין לעשות שימוש מסחרי בתוכן</li>
                    </ul>
                    
                    <h4>אחריות:</h4>
                    <p>התוכנה מסופקת "כמות שהיא" ללא אחריות מכל סוג. המפתחים אינם אחראים לכל נזק שעלול להיגרם משימוש בתוכנה.</p>
                    
                    <h4>פרטיות:</h4>
                    <ul>
                      <li>התוכנה אינה אוספת מידע אישי</li>
                      <li>כל הנתונים נשמרים מקומית במחשב שלך</li>
                    </ul>
                    
                    <h4>תמיכה:</h4>
                    <p>לשאלות, בעיות או הצעות לשיפור, אנא פנה למפתחים דרך דף הפרויקט.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryHome;
