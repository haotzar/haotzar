/**
 * פונקציות בדיקה ל-Meilisearch
 * ניתן להריץ מתוך הקונסול של הדפדפן
 */

export async function testMeilisearchConnection() {
  console.log('🔍 בודק חיבור ל-Meilisearch...');
  
  try {
    const response = await fetch('http://127.0.0.1:7700/health');
    const data = await response.json();
    
    if (data.status === 'available') {
      console.log('✅ Meilisearch פעיל ומוכן!');
      return true;
    } else {
      console.log('⚠️ Meilisearch מחזיר סטטוס לא צפוי:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ לא ניתן להתחבר ל-Meilisearch:', error.message);
    console.log('💡 וודא שהשרת רץ: await startMeilisearchTest()');
    return false;
  }
}

export async function startMeilisearchTest() {
  console.log('🚀 מנסה להפעיל את Meilisearch...');
  
  const isElectron = window.electron !== undefined;
  const isTauri = window.__TAURI__ !== undefined;
  
  console.log('📦 סביבה:', { isElectron, isTauri });
  
  if (!isElectron && !isTauri) {
    console.error('❌ Meilisearch זמין רק באפליקציה דסקטופ');
    return false;
  }
  
  try {
    let result;
    
    if (isElectron) {
      console.log('📦 מפעיל דרך Electron...');
      result = await window.electron.startMeilisearch({ port: 7700 });
    } else if (isTauri) {
      console.log('📦 Tauri is not supported in this build');
      return false;
    }
    
    console.log('📡 תגובה:', result);
    
    if (result.success) {
      console.log('✅ Meilisearch הופעל בהצלחה!');
      console.log('⏳ ממתין 2 שניות...');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // בדוק חיבור
      const connected = await testMeilisearchConnection();
      
      if (connected) {
        console.log('🎉 הכל עובד מצוין!');
        return true;
      } else {
        console.log('⚠️ השרת הופעל אבל לא ניתן להתחבר');
        return false;
      }
    } else {
      console.error('❌ שגיאה בהפעלת Meilisearch:', result.error || result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ שגיאה:', error);
    return false;
  }
}

export async function stopMeilisearchTest() {
  console.log('🛑 עוצר את Meilisearch...');
  
  const isElectron = window.electron !== undefined;
  const isTauri = window.__TAURI__ !== undefined;
  
  try {
    if (isElectron) {
      await window.electron.stopMeilisearch();
      console.log('✅ Meilisearch נסגר (Electron)');
    } else if (isTauri) {
      console.log('❌ Tauri is not supported in this build');
    }
    
    return true;
  } catch (error) {
    console.error('❌ שגיאה בעצירת Meilisearch:', error);
    return false;
  }
}

export async function testMeilisearchSearch(query = 'test') {
  console.log(`🔍 מנסה לחפש: "${query}"`);
  
  try {
    const response = await fetch(`http://127.0.0.1:7700/indexes/books/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        limit: 5
      })
    });
    
    const data = await response.json();
    
    console.log('📊 תוצאות:', {
      hits: data.hits?.length || 0,
      processingTime: data.processingTimeMs,
      query: data.query
    });
    
    if (data.hits && data.hits.length > 0) {
      console.log('📄 דוגמה לתוצאה ראשונה:');
      console.log(data.hits[0]);
    } else {
      console.log('⚠️ לא נמצאו תוצאות');
      console.log('💡 האם האינדקס בנוי? הרץ: node scripts/tools.js index:build');
    }
    
    return data;
  } catch (error) {
    console.error('❌ שגיאה בחיפוש:', error);
    return null;
  }
}

export async function getMeilisearchStats() {
  console.log('📊 מקבל סטטיסטיקות...');
  
  try {
    const response = await fetch('http://127.0.0.1:7700/indexes/books/stats');
    const data = await response.json();
    
    console.log('📊 סטטיסטיקות אינדקס:');
    console.log(`  📚 מסמכים: ${data.numberOfDocuments?.toLocaleString() || 0}`);
    console.log(`  🔄 מתעדכן: ${data.isIndexing ? 'כן' : 'לא'}`);
    console.log(`  📦 שדות: ${JSON.stringify(data.fieldDistribution || {})}`);
    
    return data;
  } catch (error) {
    console.error('❌ שגיאה בקבלת סטטיסטיקות:', error);
    return null;
  }
}

// הפוך את הפונקציות זמינות ב-window לשימוש בקונסול
if (typeof window !== 'undefined') {
  window.testMeilisearch = {
    start: startMeilisearchTest,
    stop: stopMeilisearchTest,
    connection: testMeilisearchConnection,
    search: testMeilisearchSearch,
    stats: getMeilisearchStats
  };
  
  console.log('🔧 פונקציות בדיקה זמינות ב-window.testMeilisearch:');
  console.log('  - window.testMeilisearch.start() - הפעלת Meilisearch');
  console.log('  - window.testMeilisearch.stop() - עצירת Meilisearch');
  console.log('  - window.testMeilisearch.connection() - בדיקת חיבור');
  console.log('  - window.testMeilisearch.search("query") - חיפוש');
  console.log('  - window.testMeilisearch.stats() - סטטיסטיקות');
}
