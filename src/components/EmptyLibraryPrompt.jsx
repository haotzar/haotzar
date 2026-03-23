import { 
  ArrowDownloadRegular,
  FolderOpenRegular,
  InfoRegular,
  ArrowClockwiseRegular
} from '@fluentui/react-icons';
import './EmptyLibraryPrompt.css';

const EmptyLibraryPrompt = ({ libraryType, onSelectFolder, onDownload, isDownloading }) => {
  const libraryInfo = {
    otzaria: {
      name: 'אוצריא',
      icon: '/otzaria-icon.png',
      description: 'ספריית אוצריא - אלפי ספרי קודש דיגיטליים',
      downloadText: 'הורד את מסד הנתונים',
      selectText: 'בחר תיקיית אוצריא קיימת',
      downloadUrl: 'https://github.com/Otzaria/otzaria-library/releases/download/library-db-1/seforim.db.zip',
      infoUrl: 'https://www.otzaria.org/',
      infoText: 'ספריית אוצריא כוללת אלפי ספרי קודש מסוגים שונים: תנ"ך, משנה, תלמוד, הלכה, מחשבה ועוד'
    },
    hebrewbooks: {
      name: 'HebrewBooks',
      icon: '/hebrew_books.png',
      description: 'ספריית HebrewBooks - אוסף ספרי PDF',
      downloadText: 'עבור לאתר HebrewBooks',
      selectText: 'בחר תיקיית HebrewBooks קיימת',
      downloadUrl: 'https://www.hebrewbooks.org',
      infoUrl: 'https://www.hebrewbooks.org',
      infoText: 'HebrewBooks מכילה אלפי ספרים סרוקים בפורמט PDF מכל תחומי התורה'
    }
  };

  const info = libraryInfo[libraryType] || libraryInfo.otzaria;

  return (
    <div className="empty-library-prompt">
      <div className="empty-library-content">
        <div className="empty-library-icon">
          <img src={info.icon} alt={info.name} />
        </div>
        
        <h3 className="empty-library-title">{info.name}</h3>
        <p className="empty-library-description">{info.description}</p>
        
        <div className="empty-library-info">
          <InfoRegular />
          <span>{info.infoText}</span>
        </div>

        <div className="empty-library-actions">
          <button
            className="empty-library-btn primary"
            onClick={onDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <ArrowClockwiseRegular className="spinning" />
                <span>פותח דפדפן...</span>
              </>
            ) : (
              <>
                <ArrowDownloadRegular />
                <span>{info.downloadText}</span>
              </>
            )}
          </button>

          <button
            className="empty-library-btn secondary"
            onClick={onSelectFolder}
            disabled={isDownloading}
          >
            <FolderOpenRegular />
            <span>{info.selectText}</span>
          </button>
        </div>

        <div className="empty-library-help">
          <a href={info.infoUrl} target="_blank" rel="noopener noreferrer">
            למידע נוסף
          </a>
        </div>
      </div>
    </div>
  );
};

export default EmptyLibraryPrompt;
