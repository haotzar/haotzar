# CustomAlert & CustomConfirm - מערכת התראות ואישורים מותאמת אישית

## סקירה כללית
מערכת התראות ואישורים מעוצבת שמחליפה את ה-`alert()` ו-`confirm()` הרגילים של הדפדפן עם דיאלוגים מותאמים אישית בסגנון Fluent UI.

## שימוש

### ייבוא
```javascript
import customAlert from '../utils/customAlert';
import customConfirm from '../utils/customConfirm';
```

## CustomAlert - הודעות

### דוגמאות שימוש

#### הודעה בסיסית
```javascript
customAlert('הפעולה הושלמה בהצלחה');
```

#### הודעה עם כותרת וסוג
```javascript
customAlert('הקובץ נשמר בהצלחה', { 
  type: 'success', 
  title: 'הצלחה' 
});
```

#### סוגי הודעות זמינים
- `info` - הודעת מידע (כחול) - ברירת מחדל
- `success` - הודעת הצלחה (ירוק)
- `warning` - אזהרה (כתום)
- `error` - שגיאה (אדום)

### דוגמאות מלאות

```javascript
// הודעת הצלחה
customAlert('הספר נוסף לספרייה', { 
  type: 'success', 
  title: 'הצלחה' 
});

// אזהרה
customAlert('התיקייה כבר קיימת בספרייה', { 
  type: 'warning', 
  title: 'שים לב' 
});

// שגיאה
customAlert('שגיאה בטעינת הקובץ: ' + error.message, { 
  type: 'error', 
  title: 'שגיאה' 
});

// מידע
customAlert('פונקציה זו זמינה רק בגרסת האפליקציה המותקנת', { 
  type: 'info', 
  title: 'מידע' 
});
```

## CustomConfirm - אישורים

### דוגמאות שימוש

#### אישור בסיסי
```javascript
const shouldDelete = await customConfirm('האם אתה בטוח שברצונך למחוק?');
if (shouldDelete) {
  // המשתמש לחץ אישור
}
```

#### אישור עם כותרת וסוג
```javascript
const shouldDelete = await customConfirm(
  'האם אתה בטוח שברצונך למחוק הערה זו?',
  { type: 'warning', title: 'אישור מחיקה' }
);
if (shouldDelete) {
  // המשתמש לחץ אישור
} else {
  // המשתמש לחץ ביטול
}
```

#### סוגי אישורים זמינים
- `question` - שאלה (כחול) - ברירת מחדל
- `warning` - אזהרה (כתום)

### דוגמאות מלאות

```javascript
// מחיקת פריט
const handleDelete = async () => {
  const shouldDelete = await customConfirm(
    'האם אתה בטוח שברצונך למחוק הערה זו?',
    { type: 'warning', title: 'אישור מחיקה' }
  );
  if (shouldDelete) {
    deleteNote();
  }
};

// רענון אפליקציה
const handleReload = async () => {
  const shouldReload = await customConfirm(
    'האפליקציה תתרענן כעת. האם להמשיך?',
    { type: 'question', title: 'אישור' }
  );
  if (shouldReload) {
    window.location.reload();
  }
};
```

## תכונות

- עיצוב מותאם לאפליקציה עם Fluent UI
- תמיכה בטקסט רב-שורות (שימוש ב-`\n`)
- אייקונים מתאימים לכל סוג הודעה/אישור
- אנימציות חלקות
- תמיכה במצב כהה/בהיר
- כיוון RTL מלא לעברית
- כפתורי אישור וביטול בעברית

## הטמעה

הקומפוננטים `<CustomAlert />` ו-`<CustomConfirm />` כבר מוטמעים ב-`App.jsx` ופועלים באופן גלובלי בכל האפליקציה.

אין צורך להוסיף אותם לקומפוננטים אחרים - פשוט ייבא את `customAlert` או `customConfirm` והשתמש בהם.

## הערות חשובות

- `customConfirm` מחזיר Promise, לכן יש להשתמש ב-`await` או `.then()`
- הפונקציות מחזירות `true` לאישור ו-`false` לביטול
- במקרה של שגיאה, הפונקציות חוזרות ל-`window.alert()` / `window.confirm()` הרגילים

