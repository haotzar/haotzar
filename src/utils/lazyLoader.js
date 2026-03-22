// מנהל טעינה lazy של משאבים כבדים
class LazyLoader {
  constructor() {
    this.loadedResources = new Set();
    this.loadingPromises = new Map();
  }

  // טעינת משאב עם cache
  async load(resourceName, loaderFn) {
    // אם כבר נטען, החזר מיד
    if (this.loadedResources.has(resourceName)) {
      return true;
    }

    // אם בתהליך טעינה, המתן לטעינה הקיימת
    if (this.loadingPromises.has(resourceName)) {
      return this.loadingPromises.get(resourceName);
    }

    // התחל טעינה חדשה
    const promise = (async () => {
      try {
        console.log(`⏳ טוען ${resourceName}...`);
        const startTime = performance.now();
        
        await loaderFn();
        
        const endTime = performance.now();
        console.log(`✅ ${resourceName} נטען ב-${(endTime - startTime).toFixed(0)}ms`);
        
        this.loadedResources.add(resourceName);
        this.loadingPromises.delete(resourceName);
        return true;
      } catch (error) {
        console.error(`❌ שגיאה בטעינת ${resourceName}:`, error);
        this.loadingPromises.delete(resourceName);
        return false;
      }
    })();

    this.loadingPromises.set(resourceName, promise);
    return promise;
  }

  // בדיקה אם משאב נטען
  isLoaded(resourceName) {
    return this.loadedResources.has(resourceName);
  }

  // איפוס
  reset() {
    this.loadedResources.clear();
    this.loadingPromises.clear();
  }
}

// יצירת instance יחיד
const lazyLoader = new LazyLoader();

export default lazyLoader;
