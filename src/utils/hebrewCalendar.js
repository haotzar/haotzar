// Hebrew Calendar and Zmanim utilities using @hebcal/core
import { HDate, HebrewCalendar, Sedra, DailyLearning } from '@hebcal/core';
import '@hebcal/learning';

const DAYS_OF_WEEK_HE = [
  'יום א׳', 'יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת קודש'
];

// Get Hebrew date string
function getHebrewDateString(hdate) {
  const dayOfWeek = DAYS_OF_WEEK_HE[hdate.getDay()];
  const day = hdate.renderGematriya();
  const monthName = hdate.getMonthName('h');
  
  // Remove any English text from month name (like "Sh'vat")
  const hebrewMonth = monthName.replace(/[a-zA-Z'\s]/g, '').trim();
  
  return `${dayOfWeek} ${day} ${hebrewMonth}`;
}

// Get current parsha
function getCurrentParsha(date = new Date()) {
  try {
    const hdate = new HDate(date);
    const sedra = new Sedra(hdate.getFullYear(), true); // true = Israel, false = Diaspora
    const parsha = sedra.lookup(hdate);
    
    if (parsha.chag) {
      return parsha.chag; // Return holiday name if it's a holiday
    }
    
    if (parsha.parsha && parsha.parsha.length > 0) {
      const parshaNames = parsha.parsha.map(p => {
        // Convert English parsha names to Hebrew
        const hebrewNames = {
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
          'Ha\'Azinu': 'האזינו',
          'Vezot Haberakhah': 'וזאת הברכה'
        };
        
        return hebrewNames[p] || p;
      });
      
      return parshaNames.join('-');
    }
    
    return '';
  } catch (error) {
    console.error('Error getting parsha:', error);
    return '';
  }
}

// Get Daf Yomi
function getDafYomiString(date = new Date()) {
  try {
    const hdate = new HDate(date);
    
    // Use DailyLearning API from @hebcal/learning
    const dafYomi = DailyLearning.lookup('dafYomi', hdate);
    
    if (dafYomi) {
      // Render in Hebrew
      const dafName = dafYomi.render('he');
      // Clean up the string - remove "דף יומי: " prefix if exists
      return dafName.replace('דף יומי: ', '').replace('דף יומי ', '');
    }
    
    return null; // Return null if no Daf Yomi found
  } catch (error) {
    console.error('Error getting Daf Yomi:', error);
    return null;
  }
}

// Get Daf Yomi details (masechta and daf number)
export function getDafYomiDetails(date = new Date()) {
  try {
    const hdate = new HDate(date);
    const dafYomi = DailyLearning.lookup('dafYomi', hdate);
    
    if (dafYomi) {
      const dafName = dafYomi.render('he');
      console.log('📖 Raw Daf Yomi string:', dafName);
      
      // Parse the string to extract masechta and daf
      // Format is usually: "דַּף יוֹמִי: מנחות דף כ״ח" or "דף יומי: ברכות דף כ״ג"
      let cleanName = dafName
        .replace(/דַּף יוֹמִי:\s*/g, '')
        .replace(/דף יומי:\s*/g, '')
        .replace(/דף יומי\s*/g, '')
        .replace(/מסכת\s*/g, '')
        .trim();
      
      console.log('📖 Cleaned string:', cleanName);
      
      // Split by "דף" to separate masechta from daf number
      const parts = cleanName.split(/\s+דף\s+/);
      
      if (parts.length === 2) {
        const masechta = parts[0].trim();
        const daf = parts[1].trim();
        
        console.log('📖 Parsed:', { masechta, daf });
        
        return {
          masechta: masechta,
          daf: daf,
          fullText: cleanName
        };
      }
      
      // Fallback: if no "דף" separator, split by space
      const words = cleanName.split(/\s+/);
      if (words.length >= 2) {
        // Last word is the daf number
        const daf = words[words.length - 1];
        // Everything else is the masechta name
        const masechta = words.slice(0, -1).join(' ');
        
        console.log('📖 Parsed (fallback):', { masechta, daf });
        
        return {
          masechta: masechta.trim(),
          daf: daf.trim(),
          fullText: cleanName
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting Daf Yomi details:', error);
    return null;
  }
}

// Get all zmanim info
export function getZmanimInfo(date = new Date()) {
  try {
    const hdate = new HDate(date);
    const hebrewDate = getHebrewDateString(hdate);
    const parsha = getCurrentParsha(date);
    const dafYomi = getDafYomiString(date);
    
    return {
      hebrewDate: hebrewDate,
      parsha: parsha ? `פרשת ${parsha}` : '',
      dafYomi: dafYomi,
      fullDate: `${hebrewDate} ${hdate.getFullYear()}`
    };
  } catch (error) {
    console.error('Error getting zmanim info:', error);
    // Fallback to basic info
    return {
      hebrewDate: 'יום א׳',
      parsha: '',
      dafYomi: null,
      fullDate: 'יום א׳'
    };
  }
}
