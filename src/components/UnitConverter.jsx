import { useState, useEffect } from 'react';
import { 
  ArrowSwapRegular, 
  TableRegular, 
  DismissRegular,
  RulerRegular,
  BeakerRegular,
  ScalesRegular
} from '@fluentui/react-icons';
import './UnitConverter.css';

const UnitConverter = () => {
  const [ruler, setRuler] = useState('grach'); // grach או chazonIsh
  const [category, setCategory] = useState('length'); // length, volume, weight
  const [inputValue, setInputValue] = useState('');
  const [inputUnit, setInputUnit] = useState('tefach');
  const [outputUnit, setOutputUnit] = useState('cm');
  const [outputValue, setOutputValue] = useState('0');
  const [showTableDialog, setShowTableDialog] = useState(false);

  // פונקציה לעיגול מספרים
  const roundNum = (num, d = 10) => Math.round(num * 10**d) / 10**d;

  // יחידות אורך
  const getLengthUnits = () => {
    const etzba = ruler === 'chazonIsh' ? 0.024 : 0.02;
    const tefach = roundNum(4 * etzba);
    const sit = roundNum(2 * tefach);
    const amah = roundNum(6 * tefach);
    const zeret = roundNum(0.5 * amah);
    const mil = roundNum(2000 * amah);
    const parsa = roundNum(4 * mil);
    const ris = roundNum(2/15 * mil);

    return [
      { id: 'cm', name: 'ס"מ', value: 0.01, hidden: true },
      { id: 'm', name: 'מטר', value: 1, hidden: true },
      { id: 'km', name: 'ק"מ', value: 1000, hidden: true },
      { id: 'etzba', name: 'אצבע', value: etzba, hidden: false },
      { id: 'tefach', name: 'טפח', value: tefach, hidden: false },
      { id: 'sit', name: 'שיט', value: sit, hidden: false },
      { id: 'zeret', name: 'זרת', value: zeret, hidden: false },
      { id: 'amah', name: 'אמה', value: amah, hidden: false },
      { id: 'ris', name: 'ריס', value: ris, hidden: false },
      { id: 'mil', name: 'מיל', value: mil, hidden: false },
      { id: 'parsa', name: 'פרסה', value: parsa, hidden: false },
    ];
  };

  // יחידות נפח
  const getVolumeUnits = () => {
    const etzba = ruler === 'chazonIsh' ? 0.024 : 0.02;
    const tefach = roundNum(4 * etzba);
    const beitzah = roundNum(tefach ** 3 / 2);
    const reviit = roundNum(1.5 * beitzah);
    const log = roundNum(6 * beitzah);
    const kav = roundNum(4 * log);
    const seah = roundNum(6 * kav);
    const hin = roundNum(12 * log);
    const bat = roundNum(3 * seah);
    const eifah = roundNum(3 * seah);
    const letek = roundNum(15 * seah);
    const kor = roundNum(30 * seah);

    return [
      { id: 'ml', name: 'מ"ל', value: 0.000001, hidden: true },
      { id: 'l', name: 'ליטר', value: 0.001, hidden: true },
      { id: 'beitzah', name: 'ביצה', value: beitzah, hidden: false },
      { id: 'reviit', name: 'רביעית', value: reviit, hidden: false },
      { id: 'log', name: 'לוג', value: log, hidden: false },
      { id: 'kav', name: 'קב', value: kav, hidden: false },
      { id: 'seah', name: 'סאה', value: seah, hidden: false },
      { id: 'hin', name: 'הין', value: hin, hidden: false },
      { id: 'bat', name: 'בת', value: bat, hidden: false },
      { id: 'eifah', name: 'איפה', value: eifah, hidden: false },
      { id: 'letek', name: 'לתך', value: letek, hidden: false },
      { id: 'kor', name: 'כור', value: kor, hidden: false },
    ];
  };

  // יחידות משקל
  const getWeightUnits = () => {
    const gerah = 0.8;
    const shekel = roundNum(20 * gerah);
    const maneh = roundNum(100 * shekel);
    const kikar = roundNum(60 * maneh);

    return [
      { id: 'g', name: 'גרם', value: 1, hidden: true },
      { id: 'kg', name: 'ק"ג', value: 1000, hidden: true },
      { id: 'gerah', name: 'גרה', value: gerah, hidden: false },
      { id: 'shekel', name: 'שקל', value: shekel, hidden: false },
      { id: 'maneh', name: 'מנה', value: maneh, hidden: false },
      { id: 'kikar', name: 'ככר', value: kikar, hidden: false },
    ];
  };

  // קבלת יחידות לפי קטגוריה
  const getUnits = () => {
    switch (category) {
      case 'length':
        return getLengthUnits();
      case 'volume':
        return getVolumeUnits();
      case 'weight':
        return getWeightUnits();
      default:
        return [];
    }
  };

  // המרה
  const convert = (value, fromUnit, toUnit) => {
    const units = getUnits();
    const from = units.find(u => u.id === fromUnit);
    const to = units.find(u => u.id === toUnit);
    
    if (!from || !to || !value || isNaN(value)) return '0';
    
    const baseValue = parseFloat(value) * from.value;
    const result = baseValue / to.value;
    
    return roundNum(result).toString();
  };

  // עדכון פלט כאשר הקלט משתנה
  useEffect(() => {
    if (inputValue) {
      const result = convert(inputValue, inputUnit, outputUnit);
      setOutputValue(result);
    } else {
      setOutputValue('0');
    }
  }, [inputValue, inputUnit, outputUnit, ruler, category]);

  // החלפת יחידות
  const swapUnits = () => {
    setInputUnit(outputUnit);
    setOutputUnit(inputUnit);
    setInputValue(outputValue);
  };

  // שינוי קטגוריה
  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    // איפוס יחידות ברירת מחדל
    if (newCategory === 'length') {
      setInputUnit('tefach');
      setOutputUnit('cm');
    } else if (newCategory === 'volume') {
      setInputUnit('reviit');
      setOutputUnit('ml');
    } else if (newCategory === 'weight') {
      setInputUnit('shekel');
      setOutputUnit('g');
    }
    setInputValue('');
    setOutputValue('0');
  };

  const units = getUnits();
  const halachicUnits = units.filter(u => !u.hidden);
  const metricUnits = units.filter(u => u.hidden);

  return (
    <div className="unit-converter">
      <div className="converter-layout">
        {/* ניווט צד ימין */}
        <div className="converter-sidebar">
          <div className="category-cards">
            <button
              className={`category-card ${category === 'length' ? 'active' : ''}`}
              onClick={() => handleCategoryChange('length')}
              title="אורך"
            >
              <RulerRegular className="category-icon" />
              <div className="category-name">אורך</div>
            </button>
            <button
              className={`category-card ${category === 'volume' ? 'active' : ''}`}
              onClick={() => handleCategoryChange('volume')}
              title="נפח"
            >
              <BeakerRegular className="category-icon" />
              <div className="category-name">נפח</div>
            </button>
            <button
              className={`category-card ${category === 'weight' ? 'active' : ''}`}
              onClick={() => handleCategoryChange('weight')}
              title="משקל"
            >
              <ScalesRegular className="category-icon" />
              <div className="category-name">משקל</div>
            </button>
          </div>
        </div>

        {/* תוכן ראשי */}
        <div className="converter-main">
          {/* שורת בקרה עליונה */}
          <div className="converter-controls">
            {/* בחירת שיטה - רק לאורך ונפח */}
            {category !== 'weight' && (
              <div className="ruler-selector">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="ruler"
                    value="grach"
                    checked={ruler === 'grach'}
                    onChange={(e) => setRuler(e.target.value)}
                  />
                  <span>גר"ח</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="ruler"
                    value="chazonIsh"
                    checked={ruler === 'chazonIsh'}
                    onChange={(e) => setRuler(e.target.value)}
                  />
                  <span>חזון איש</span>
                </label>
              </div>
            )}

            {/* כפתור פתיחת טבלה */}
            <button
              className="show-table-btn"
              onClick={() => setShowTableDialog(true)}
            >
              <TableRegular />
              <span>הצג טבלת המרות</span>
            </button>
          </div>

          {/* מחשבון ההמרה */}
          <div className="converter-row">
            {/* מיכל קלט */}
            <div className="converter-card">
              <div className="converter-column">
                <label className="converter-label">מ:</label>
                <input
                  type="number"
                  className="converter-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="0"
                  dir="ltr"
                />
                <select
                  className="converter-select"
                  value={inputUnit}
                  onChange={(e) => setInputUnit(e.target.value)}
                >
                  <optgroup label="מידות הלכתיות">
                    {halachicUnits.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="מידות מטריות">
                    {metricUnits.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* כפתור החלפה */}
            <div className="converter-swap">
              <button
                className="swap-btn"
                onClick={swapUnits}
                title="החלף יחידות"
              >
                <ArrowSwapRegular />
              </button>
            </div>

            {/* מיכל פלט */}
            <div className="converter-card">
              <div className="converter-column">
                <label className="converter-label">ל:</label>
                <input
                  type="text"
                  className="converter-input"
                  value={outputValue}
                  readOnly
                  dir="ltr"
                />
                <select
                  className="converter-select"
                  value={outputUnit}
                  onChange={(e) => setOutputUnit(e.target.value)}
                >
                  <optgroup label="מידות הלכתיות">
                    {halachicUnits.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="מידות מטריות">
                    {metricUnits.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* דיאלוג טבלת המרות */}
      {showTableDialog && (
        <div className="dialog-overlay" onClick={() => setShowTableDialog(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>טבלת המרות</h3>
              <button
                className="dialog-close-btn"
                onClick={() => setShowTableDialog(false)}
                title="סגור"
              >
                <DismissRegular />
              </button>
            </div>
            <div className="dialog-body">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>יחידה</th>
                      <th>ערך</th>
                    </tr>
                  </thead>
                  <tbody>
                    {halachicUnits.map(unit => {
                      const value = convert('1', unit.id, metricUnits[0].id);
                      const metricUnit = metricUnits[0].name;
                      return (
                        <tr key={unit.id}>
                          <td>{unit.name}</td>
                          <td dir="ltr">{value} {metricUnit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitConverter;
