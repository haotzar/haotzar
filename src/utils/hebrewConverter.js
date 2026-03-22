/**
 * המרת טקסט מאנגלית לעברית
 * כשמשתמש מקליד באנגלית במקום בעברית, המערכת תמיר אוטומטית
 */

// מיפוי מקשים מאנגלית לעברית
const EN_TO_HE_MAP = {
  // אותיות קטנות
  'q': '/', 'w': "'", 'e': 'ק', 'r': 'ר', 't': 'א', 'y': 'ט', 'u': 'ו', 'i': 'ן', 'o': 'ם', 'p': 'פ',
  'a': 'ש', 's': 'ד', 'd': 'ג', 'f': 'כ', 'g': 'ע', 'h': 'י', 'j': 'ח', 'k': 'ל', 'l': 'ך', ';': 'ף',
  'z': 'ז', 'x': 'ס', 'c': 'ב', 'v': 'ה', 'b': 'נ', 'n': 'מ', 'm': 'צ', ',': 'ת', '.': 'ץ', '/': '.',
  
  // אותיות גדולות - ממופות לאותן אותיות עבריות כמו הקטנות
  'Q': '/', 'W': "'", 'E': 'ק', 'R': 'ר', 'T': 'א', 'Y': 'ט', 'U': 'ו', 'I': 'ן', 'O': 'ם', 'P': 'פ',
  'A': 'ש', 'S': 'ד', 'D': 'ג', 'F': 'כ', 'G': 'ע', 'H': 'י', 'J': 'ח', 'K': 'ל', 'L': 'ך', ':': 'ף',
  'Z': 'ז', 'X': 'ס', 'C': 'ב', 'V': 'ה', 'B': 'נ', 'N': 'מ', 'M': 'צ', '<': 'ת', '>': 'ץ', '?': '.',
};

/**
 * בדיקה האם הטקסט הוא באנגלית (כשהכוונה הייתה עברית)
 * @param {string} text - הטקסט לבדיקה
 * @returns {boolean} - האם הטקסט נראה כמו אנגלית שצריכה להיות עברית
 */
export const isEnglishTypedAsHebrew = (text) => {
  if (!text || text.length < 2) return false;
  
  // ספור כמה תווים אנגליים יש
  const englishChars = text.split('').filter(char => {
    const code = char.charCodeAt(0);
    return (code >= 65 && code <= 90) || (code >= 97 && code <= 122); // A-Z, a-z
  }).length;
  
  // ספור כמה תווים עבריים יש
  const hebrewChars = text.split('').filter(char => {
    const code = char.charCodeAt(0);
    return code >= 0x0590 && code <= 0x05FF; // טווח עברית
  }).length;
  
  // אם יש יותר אנגלית מעברית ויש לפחות 2 תווים אנגליים - זה כנראה טעות הקלדה
  return englishChars >= 2 && englishChars > hebrewChars;
};

/**
 * המרת טקסט מאנגלית לעברית
 * @param {string} text - הטקסט להמרה
 * @returns {string} - הטקסט המומר לעברית
 */
export const convertEnglishToHebrew = (text) => {
  if (!text) return text;
  
  return text.split('').map(char => {
    return EN_TO_HE_MAP[char] || char;
  }).join('');
};

/**
 * המרה אוטומטית של טקסט חיפוש
 * בודק אם הטקסט הוא באנגלית ומחזיר גם את המקור וגם את ההמרה
 * @param {string} searchText - טקסט החיפוש
 * @returns {object} - { original, converted, shouldConvert }
 */
export const autoConvertSearch = (searchText) => {
  const shouldConvert = isEnglishTypedAsHebrew(searchText);
  
  return {
    original: searchText,
    converted: shouldConvert ? convertEnglishToHebrew(searchText) : searchText,
    shouldConvert
  };
};

export default {
  isEnglishTypedAsHebrew,
  convertEnglishToHebrew,
  autoConvertSearch
};
