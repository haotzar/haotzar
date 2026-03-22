import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HDate, HebrewCalendar, Sedra, Location, Zmanim } from '@hebcal/core';
import { 
  ChevronRightRegular, 
  ChevronLeftRegular,
  CalendarTodayRegular,
  ClockRegular,
  LocationRegular
} from '@fluentui/react-icons';
import './HebrewCalendar.css';

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAYS_OF_WEEK_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// Hebrew parsha names mapping
const PARSHA_NAMES = {
  'Bereshit': 'בראשית',
  'Noach': 'נח',
  'Lech-Lecha': 'לך לך',
  'Vayera': 'וירא',
  'Chayei Sara': 'חיי שרה',
  'Toldot': 'תולדות',
  'Vayetzei': 'ויצא',
  'Vayishlach': 'וישלח',
  'Vayeshev': 'וישב',
  'Miketz': 'מקץ',
  'Vayigash': 'ויגש',
  'Vayechi': 'ויחי',
  'Shemot': 'שמות',
  'Vaera': 'וארא',
  'Bo': 'בא',
  'Beshalach': 'בשלח',
  'Yitro': 'יתרו',
  'Mishpatim': 'משפטים',
  'Terumah': 'תרומה',
  'Tetzaveh': 'תצוה',
  'Ki Tisa': 'כי תשא',
  'Vayakhel': 'ויקהל',
  'Pekudei': 'פקודי',
  'Vayikra': 'ויקרא',
  'Tzav': 'צו',
  'Shmini': 'שמיני',
  'Tazria': 'תזריע',
  'Metzora': 'מצורע',
  'Achrei Mot': 'אחרי מות',
  'Kedoshim': 'קדושים',
  'Emor': 'אמור',
  'Behar': 'בהר',
  'Bechukotai': 'בחקתי',
  'Bamidbar': 'במדבר',
  'Nasso': 'נשא',
  'Beha\'alotcha': 'בהעלתך',
  'Sh\'lach': 'שלח לך',
  'Korach': 'קרח',
  'Chukat': 'חקת',
  'Balak': 'בלק',
  'Pinchas': 'פנחס',
  'Matot': 'מטות',
  'Masei': 'מסעי',
  'Devarim': 'דברים',
  'Vaetchanan': 'ואתחנן',
  'Eikev': 'עקב',
  'Re\'eh': 'ראה',
  'Shoftim': 'שופטים',
  'Ki Teitzei': 'כי תצא',
  'Ki Tavo': 'כי תבוא',
  'Nitzavim': 'נצבים',
  'Vayeilech': 'וילך',
  'Ha\'azinu': 'האזינו',
  'Vezot Haberakhah': 'וזאת הברכה'
};

// Get parsha for a specific date
const getParsha = (date) => {
  try {
    const hdate = new HDate(date);
    const sedra = new Sedra(hdate.getFullYear(), true); // true = Israel, false = Diaspora
    const parsha = sedra.lookup(hdate);
    
    if (parsha.chag) {
      return null; // Don't show parsha on holidays
    }
    
    if (parsha.parsha && parsha.parsha.length > 0) {
      const parshaNames = parsha.parsha.map(p => PARSHA_NAMES[p] || p);
      return parshaNames.join('-');
    }
    
    return null;
  } catch (error) {
    console.error('Error getting parsha:', error);
    return null;
  }
};

const HebrewCalendarComponent = ({ onDateSelect, onMonthChange }) => {
  // Start with Hebrew date
  const [currentHDate, setCurrentHDate] = useState(new HDate());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [zmanimDialogOpen, setZmanimDialogOpen] = useState(false);
  const [zmanimDialogDate, setZmanimDialogDate] = useState(null);
  const [zmanimData, setZmanimData] = useState(null);
  const [selectedCity, setSelectedCity] = useState(() => {
    // Load saved city from localStorage or default to Jerusalem
    return localStorage.getItem('hebrewCalendarCity') || 'Jerusalem';
  });

  // Available cities in Israel (verified to work with @hebcal/core)
  const availableCities = [
    { name: 'Jerusalem', hebrewName: 'ירושלים' },
    { name: 'Tel Aviv', hebrewName: 'תל אביב' },
    { name: 'Haifa', hebrewName: 'חיפה' },
    { name: 'Beer Sheva', hebrewName: 'באר שבע' },
    { name: 'Eilat', hebrewName: 'אילת' },
    { name: 'Tiberias', hebrewName: 'טבריה' }
  ];

  // Calculate zmanim for a specific date and city
  const calculateZmanim = (date, cityName = selectedCity) => {
    try {
      // Use selected city
      const location = Location.lookup(cityName);
      if (!location) {
        console.error(`Could not find ${cityName} location`);
        return null;
      }

      const zmanim = new Zmanim(location, date);
      const hdate = new HDate(date);

      // Format time to HH:MM
      const formatTime = (time) => {
        if (!time) return '--:--';
        const hours = time.getHours().toString().padStart(2, '0');
        const minutes = time.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      };

      // Get parsha if it's Shabbat
      const parsha = hdate.getDay() === 6 ? getParsha(date) : null;

      // Get Hebrew city name
      const cityInfo = availableCities.find(c => c.name === cityName);
      const hebrewCityName = cityInfo ? cityInfo.hebrewName : cityName;

      return {
        hebrewDate: hdate.renderGematriya(),
        gregorianDate: date.toLocaleDateString('he-IL'),
        dayOfWeek: DAYS_OF_WEEK_FULL[hdate.getDay()],
        parsha: parsha,
        cityName: cityName,
        hebrewCityName: hebrewCityName,
        alotHaShachar: formatTime(zmanim.alotHaShachar()),
        misheyakir: formatTime(zmanim.misheyakir()),
        sunrise: formatTime(zmanim.sunrise()),
        sofZmanShma: formatTime(zmanim.sofZmanShma()),
        sofZmanTfilla: formatTime(zmanim.sofZmanTfilla()),
        chatzot: formatTime(zmanim.chatzot()),
        minchaGedola: formatTime(zmanim.minchaGedola()),
        minchaKetana: formatTime(zmanim.minchaKetana()),
        plagHaMincha: formatTime(zmanim.plagHaMincha()),
        sunset: formatTime(zmanim.sunset()),
        tzeit: formatTime(zmanim.tzeit()),
        chatzotNight: formatTime(zmanim.chatzotNight())
      };
    } catch (error) {
      console.error('Error calculating zmanim:', error);
      return null;
    }
  };

  // Open zmanim dialog
  const openZmanimDialog = (date, event) => {
    event.stopPropagation(); // Prevent day selection
    const zmanim = calculateZmanim(date, selectedCity);
    setZmanimData(zmanim);
    setZmanimDialogDate(date);
    setZmanimDialogOpen(true);
  };

  // Change city and recalculate zmanim
  const handleCityChange = (cityName) => {
    setSelectedCity(cityName);
    if (zmanimDialogDate) {
      const zmanim = calculateZmanim(zmanimDialogDate, cityName);
      setZmanimData(zmanim);
    }
  };

  // Close zmanim dialog
  const closeZmanimDialog = () => {
    setZmanimDialogOpen(false);
    setZmanimDialogDate(null);
    setZmanimData(null);
  };

  // Notify parent when date changes
  useEffect(() => {
    if (onDateSelect) {
      const info = getHebrewDateInfo(selectedDate);
      onDateSelect(selectedDate, info);
    }
  }, [selectedDate]);

  // Notify parent when month changes
  useEffect(() => {
    if (onMonthChange) {
      const monthYear = formatMonthYear();
      onMonthChange(monthYear.hebrew, goToPreviousMonth, goToNextMonth);
    }
  }, [currentHDate]);

  // Get Hebrew date info
  const getHebrewDateInfo = (date) => {
    try {
      const hdate = new HDate(date);
      
      // Hebrew month names mapping
      const monthNames = {
        'Nisan': 'ניסן',
        'Iyyar': 'אייר',
        'Sivan': 'סיוון',
        'Tamuz': 'תמוז',
        'Av': 'אב',
        'Elul': 'אלול',
        'Tishrei': 'תשרי',
        'Cheshvan': 'חשוון',
        'Kislev': 'כסלו',
        'Tevet': 'טבת',
        'Sh\'vat': 'שבט',
        'Adar': 'אדר',
        'Adar I': 'אדר א׳',
        'Adar II': 'אדר ב׳'
      };
      
      const englishMonth = hdate.getMonthName('en');
      const hebrewMonth = monthNames[englishMonth] || hdate.getMonthName('h');
      
      // Get only the day in gematriya (not the full date)
      const day = hdate.getDate();
      
      // Convert day number to Hebrew letters
      const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
      const tens = ['', 'י', 'כ', 'ל'];
      
      let gematriya = '';
      if (day === 15) {
        gematriya = 'טו'; // Special case
      } else if (day === 16) {
        gematriya = 'טז'; // Special case
      } else {
        const tensDigit = Math.floor(day / 10);
        const onesDigit = day % 10;
        if (tensDigit > 0) gematriya += tens[tensDigit];
        if (onesDigit > 0) gematriya += ones[onesDigit];
      }
      
      return {
        day: hdate.getDate(),
        month: hebrewMonth,
        monthNum: hdate.getMonth(),
        year: hdate.getFullYear(),
        dayOfWeek: DAYS_OF_WEEK_FULL[hdate.getDay()],
        gematriya: gematriya,
        gematriyaFull: hdate.renderGematriya(), // Keep full for selected date card
        holidays: HebrewCalendar.getHolidaysOnDate(hdate) || [],
        gregorianDate: date,
        parsha: hdate.getDay() === 6 ? getParsha(date) : null // Only get parsha for Shabbat (day 6)
      };
    } catch (error) {
      console.error('Error getting Hebrew date:', error);
      return null;
    }
  };

  // Helper to get number of months in Hebrew year
  const getMonthsInYear = (year) => {
    // Hebrew leap years have 13 months, regular years have 12
    return HDate.isLeapYear(year) ? 13 : 12;
  };

  // Get calendar days for current Hebrew month
  const getCalendarDays = () => {
    const hebrewYear = currentHDate.getFullYear();
    const hebrewMonth = currentHDate.getMonth();
    
    // Get number of days in this Hebrew month
    const daysInMonth = currentHDate.daysInMonth();
    
    // Get first day of Hebrew month
    const firstDayHDate = new HDate(1, hebrewMonth, hebrewYear);
    const firstDayGregorian = firstDayHDate.greg();
    const firstDayOfWeek = firstDayGregorian.getDay();
    
    const days = [];
    
    // Add previous month days
    // Tishrei (month 7) is the start of the Hebrew year
    const monthsInPrevYear = getMonthsInYear(hebrewYear - 1);
    const prevMonth = hebrewMonth === 1 ? monthsInPrevYear : hebrewMonth - 1;
    const prevYear = hebrewMonth === 7 ? hebrewYear - 1 : hebrewYear;
    const prevMonthHDate = new HDate(1, prevMonth, prevYear);
    const daysInPrevMonth = prevMonthHDate.daysInMonth();
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const hdate = new HDate(day, prevMonth, prevYear);
      const gregorianDate = hdate.greg();
      
      days.push({
        date: gregorianDate,
        hebrewDay: day,
        isCurrentMonth: false,
        isToday: false,
        hebrewInfo: getHebrewDateInfo(gregorianDate)
      });
    }
    
    // Add current month days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const hdate = new HDate(day, hebrewMonth, hebrewYear);
      const gregorianDate = hdate.greg();
      gregorianDate.setHours(0, 0, 0, 0);
      
      const todayCheck = new Date(gregorianDate);
      todayCheck.setHours(0, 0, 0, 0);
      
      days.push({
        date: gregorianDate,
        hebrewDay: day,
        isCurrentMonth: true,
        isToday: todayCheck.getTime() === today.getTime(),
        hebrewInfo: getHebrewDateInfo(gregorianDate)
      });
    }
    
    // Add next month days to complete the grid
    // Tishrei (month 7) is the start of the Hebrew year
    const monthsInCurrentYear = getMonthsInYear(hebrewYear);
    const isElul = (hebrewMonth === 6 && !HDate.isLeapYear(hebrewYear)) || 
                   (hebrewMonth === 13 && HDate.isLeapYear(hebrewYear));
    
    const nextMonth = hebrewMonth === monthsInCurrentYear ? 1 : hebrewMonth + 1;
    const nextYear = isElul ? hebrewYear + 1 : hebrewYear;
    
    const remainingDays = 35 - days.length; // 5 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const hdate = new HDate(day, nextMonth, nextYear);
      const gregorianDate = hdate.greg();
      
      days.push({
        date: gregorianDate,
        hebrewDay: day,
        isCurrentMonth: false,
        isToday: false,
        hebrewInfo: getHebrewDateInfo(gregorianDate)
      });
    }
    
    return days;
  };

  // Navigate months
  const goToPreviousMonth = () => {
    const hebrewYear = currentHDate.getFullYear();
    const hebrewMonth = currentHDate.getMonth();
    
    // Tishrei (month 7) is the start of the Hebrew year
    // Year changes when going from Tishrei backwards to Elul
    const monthsInPrevYear = getMonthsInYear(hebrewYear - 1);
    const prevMonth = hebrewMonth === 1 ? monthsInPrevYear : hebrewMonth - 1;
    const prevYear = hebrewMonth === 7 ? hebrewYear - 1 : hebrewYear;
    
    setCurrentHDate(new HDate(1, prevMonth, prevYear));
  };

  const goToNextMonth = () => {
    const hebrewYear = currentHDate.getFullYear();
    const hebrewMonth = currentHDate.getMonth();
    
    // Tishrei (month 7) is the start of the Hebrew year
    // Year changes when going from Elul (month 6 or 13 in leap year) to Tishrei
    const monthsInCurrentYear = getMonthsInYear(hebrewYear);
    const isElul = (hebrewMonth === 6 && !HDate.isLeapYear(hebrewYear)) || 
                   (hebrewMonth === 13 && HDate.isLeapYear(hebrewYear));
    
    const nextMonth = hebrewMonth === monthsInCurrentYear ? 1 : hebrewMonth + 1;
    const nextYear = isElul ? hebrewYear + 1 : hebrewYear;
    
    setCurrentHDate(new HDate(1, nextMonth, nextYear));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentHDate(new HDate(today));
    setSelectedDate(today);
  };

  // Format month and year
  const formatMonthYear = () => {
    // Get Hebrew month name
    const monthNames = {
      'Nisan': 'ניסן',
      'Iyyar': 'אייר',
      'Sivan': 'סיוון',
      'Tamuz': 'תמוז',
      'Av': 'אב',
      'Elul': 'אלול',
      'Tishrei': 'תשרי',
      'Cheshvan': 'חשוון',
      'Kislev': 'כסלו',
      'Tevet': 'טבת',
      'Sh\'vat': 'שבט',
      'Adar': 'אדר',
      'Adar I': 'אדר א׳',
      'Adar II': 'אדר ב׳'
    };
    
    const englishMonth = currentHDate.getMonthName('en');
    const hebrewMonth = monthNames[englishMonth] || currentHDate.getMonthName('h');
    const hebrewYear = currentHDate.getFullYear();
    
    // Convert year to Hebrew gematriya format
    // For years like 5786, we show תשפ״ו (we drop the 5000)
    const remainder = hebrewYear % 1000;
    
    // Hebrew number mapping
    const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    const hundreds = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];
    
    let yearStr = '';
    
    // Add hundreds
    const hundredsDigit = Math.floor(remainder / 100);
    if (hundredsDigit > 0 && hundredsDigit <= 9) {
      yearStr += hundreds[hundredsDigit];
    }
    
    // Add tens and ones
    const tensOnes = remainder % 100;
    if (tensOnes === 15) {
      yearStr += 'טו'; // Special case
    } else if (tensOnes === 16) {
      yearStr += 'טז'; // Special case
    } else {
      const tensDigit = Math.floor(tensOnes / 10);
      const onesDigit = tensOnes % 10;
      if (tensDigit > 0) yearStr += tens[tensDigit];
      if (onesDigit > 0) yearStr += ones[onesDigit];
    }
    
    // Add geresh or gershayim
    if (yearStr.length === 1) {
      yearStr += '׳'; // geresh for single letter
    } else if (yearStr.length > 1) {
      // Insert gershayim before last letter
      yearStr = yearStr.slice(0, -1) + '״' + yearStr.slice(-1);
    }
    
    return {
      hebrew: `${hebrewMonth} ${yearStr}`
    };
  };

  const calendarDays = getCalendarDays();
  const monthYear = formatMonthYear();
  const selectedInfo = getHebrewDateInfo(selectedDate);

  // Notify parent about month change
  useEffect(() => {
    if (onDateSelect) {
      onDateSelect(selectedDate, selectedInfo, monthYear.hebrew);
    }
  }, [selectedDate, currentHDate]);

  return (
    <div className="hebrew-calendar-container">
      {/* Calendar Grid */}
      <div className="calendar-grid">
        {/* Days of week header */}
        <div className="calendar-weekdays">
          {DAYS_OF_WEEK.map((day, index) => (
            <div key={index} className="weekday-cell">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="calendar-days">
          {calendarDays.map((dayInfo, index) => {
            const isSelected = dayInfo.date.getTime() === selectedDate.getTime();
            const hasHoliday = dayInfo.hebrewInfo?.holidays?.length > 0;
            const hasParsha = dayInfo.hebrewInfo?.parsha;
            
            return (
              <div
                key={index}
                className={`calendar-day ${!dayInfo.isCurrentMonth ? 'other-month' : ''} ${
                  dayInfo.isToday ? 'today' : ''
                } ${isSelected ? 'selected' : ''} ${hasHoliday ? 'has-holiday' : ''} ${hasParsha ? 'has-parsha' : ''}`}
                onClick={() => setSelectedDate(dayInfo.date)}
              >
                <div className="day-content">
                  <div className="hebrew-day-main">
                    {dayInfo.hebrewInfo?.gematriya}
                  </div>
                  <div className="gregorian-day-small">
                    {dayInfo.date.getDate()}
                  </div>
                  {dayInfo.isCurrentMonth && (
                    <button
                      className="zmanim-icon-btn"
                      onClick={(e) => openZmanimDialog(dayInfo.date, e)}
                      title="זמני היום"
                    >
                      <ClockRegular />
                    </button>
                  )}
                </div>
                {hasHoliday && (
                  <div className="holiday-indicator" title={dayInfo.hebrewInfo.holidays[0].render('he')}>
                    •
                  </div>
                )}
                {hasParsha && (
                  <div className="parsha-name" title={`פרשת ${hasParsha}`}>
                    {hasParsha}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Zmanim Dialog - rendered via Portal to escape stacking context */}
      {zmanimDialogOpen && zmanimData && createPortal(
        <div className="zmanim-dialog-overlay" onClick={closeZmanimDialog}>
          <div className="zmanim-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="zmanim-dialog-header">
              <div className="header-content">
                <h3>זמני היום</h3>
                <div className="header-info">
                  <div className="date-info">
                    <span className="hebrew-date-inline">{zmanimData.hebrewDate}</span>
                    <span className="date-separator">•</span>
                    <span className="gregorian-date-inline">{zmanimData.gregorianDate}</span>
                  </div>
                  <div className="city-selector-inline">
                    <LocationRegular className="city-icon-inline" />
                    <select 
                      id="city-select"
                      value={selectedCity} 
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="city-select-inline"
                      title="בחר עיר לחישוב זמנים"
                    >
                      {availableCities.map((city) => (
                        <option key={city.name} value={city.name}>
                          {city.hebrewName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {zmanimData.parsha && (
                  <div className="parsha-info-inline">פרשת {zmanimData.parsha}</div>
                )}
              </div>
              <button className="close-btn" onClick={closeZmanimDialog}>×</button>
            </div>
            <div className="zmanim-dialog-content" key={selectedCity}>
              <div className="zmanim-section">
                <h4>שחרית</h4>
                <div className="zman-item">
                  <span className="zman-label">עלות השחר:</span>
                  <span className="zman-time">{zmanimData.alotHaShachar}</span>
                </div>
                <div className="zman-item">
                  <span className="zman-label">משיכיר:</span>
                  <span className="zman-time">{zmanimData.misheyakir}</span>
                </div>
                <div className="zman-item">
                  <span className="zman-label">נץ החמה:</span>
                  <span className="zman-time">{zmanimData.sunrise}</span>
                </div>
                <div className="zman-item highlight">
                  <span className="zman-label">סוף זמן ק"ש:</span>
                  <span className="zman-time">{zmanimData.sofZmanShma}</span>
                </div>
                <div className="zman-item highlight">
                  <span className="zman-label">סוף זמן תפילה:</span>
                  <span className="zman-time">{zmanimData.sofZmanTfilla}</span>
                </div>
              </div>

              <div className="zmanim-section">
                <h4>צהריים ומנחה</h4>
                <div className="zman-item">
                  <span className="zman-label">חצות היום:</span>
                  <span className="zman-time">{zmanimData.chatzot}</span>
                </div>
                <div className="zman-item">
                  <span className="zman-label">מנחה גדולה:</span>
                  <span className="zman-time">{zmanimData.minchaGedola}</span>
                </div>
                <div className="zman-item">
                  <span className="zman-label">מנחה קטנה:</span>
                  <span className="zman-time">{zmanimData.minchaKetana}</span>
                </div>
                <div className="zman-item">
                  <span className="zman-label">פלג המנחה:</span>
                  <span className="zman-time">{zmanimData.plagHaMincha}</span>
                </div>
              </div>

              <div className="zmanim-section">
                <h4>ערבית</h4>
                <div className="zman-item highlight">
                  <span className="zman-label">שקיעה:</span>
                  <span className="zman-time">{zmanimData.sunset}</span>
                </div>
                <div className="zman-item highlight">
                  <span className="zman-label">צאת הכוכבים:</span>
                  <span className="zman-time">{zmanimData.tzeit}</span>
                </div>
                <div className="zman-item">
                  <span className="zman-label">חצות הלילה:</span>
                  <span className="zman-time">{zmanimData.chatzotNight}</span>
                </div>
              </div>
            </div>
            <div className="zmanim-dialog-footer">
              <p className="location-note">זמנים לפי {zmanimData.hebrewCityName}</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default HebrewCalendarComponent;

// Export selected date info for parent component
export { HebrewCalendarComponent };
