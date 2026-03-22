import { useState } from 'react';
import './CategoryFilter.css';

const CategoryFilter = ({ selectedCategory, onCategoryChange, categories, moreCategories }) => {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="category-filter">
      {/* שורה ראשונה */}
      <div className="category-tabs">
        {/* כל הקטגוריות */}
        <button
          className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => onCategoryChange('all')}
        >
          הכל
        </button>

        {/* קטגוריות דינמיות */}
        {categories.map((category) => (
          <button
            key={category.id}
            className={`category-tab ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => onCategoryChange(category.id)}
          >
            {category.name}
          </button>
        ))}

        {/* כפתור עוד */}
        <button
          className={`category-tab more-btn ${showMore ? 'active' : ''}`}
          onClick={() => setShowMore(!showMore)}
        >
          עוד ▼
        </button>
      </div>

      {/* שורה שנייה - קטגוריות נוספות */}
      {showMore && (
        <div className="category-tabs category-tabs-secondary">
          {moreCategories.map((category) => (
            <button
              key={category.id}
              className={`category-tab ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => onCategoryChange(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;
