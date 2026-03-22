import { useState } from 'react';
import { Text, Button, Spinner } from '@fluentui/react-components';
import { DocumentTextRegular, ChevronDownRegular, ChevronUpRegular } from '@fluentui/react-icons';
import './SearchResults.css';

const SearchResults = ({ results, onFileClick, isSearching }) => {
  const [expandedResults, setExpandedResults] = useState(new Set());

  const toggleExpand = (fileId) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId);
    } else {
      newExpanded.add(fileId);
    }
    setExpandedResults(newExpanded);
  };

  const highlightMatch = (context) => {
    const { text, matchIndex, matchLength } = context;
    const before = text.substring(0, matchIndex);
    const match = text.substring(matchIndex, matchIndex + matchLength);
    const after = text.substring(matchIndex + matchLength);

    return (
      <span className="context-text">
        {before}
        <mark className="search-highlight">{match}</mark>
        {after}
      </span>
    );
  };

  if (isSearching) {
    return (
      <div className="search-loading">
        <Spinner size="large" />
        <Text size={400} style={{ marginTop: '16px' }}>
          מחפש בקבצים...
        </Text>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="search-results-container">
      <div className="results-header">
        <Text size={500} weight="semibold">
          נמצאו {results.length} קבצים
        </Text>
        <Text size={300} style={{ opacity: 0.7 }}>
          סה"כ {results.reduce((sum, r) => sum + r.matchCount, 0)} התאמות
        </Text>
      </div>

      <div className="results-list">
        {results.map((result) => {
          const isExpanded = expandedResults.has(result.file.id);
          
          return (
            <div key={result.file.id} className="result-card">
              <div className="result-header" onClick={() => toggleExpand(result.file.id)}>
                <div className="result-info">
                  <DocumentTextRegular className="result-icon" />
                  <div className="result-title-section">
                    <Text size={400} weight="semibold" className="result-title">
                      {result.file.name}
                    </Text>
                    <Text size={300} className="result-count">
                      {result.matchCount} התאמות
                    </Text>
                  </div>
                </div>
                <div className="result-actions">
                  <Button
                    appearance="subtle"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileClick(result.file);
                    }}
                  >
                    פתח
                  </Button>
                  {isExpanded ? <ChevronUpRegular /> : <ChevronDownRegular />}
                </div>
              </div>

              {isExpanded && (
                <div className="result-contexts">
                  {result.contexts.map((context, index) => (
                    <div key={index} className="context-item">
                      <div className="context-number">{index + 1}</div>
                      <div className="context-content">
                        {highlightMatch(context)}
                      </div>
                    </div>
                  ))}
                  {result.matchCount > result.contexts.length && (
                    <Text size={300} className="more-matches">
                      ועוד {result.matchCount - result.contexts.length} התאמות נוספות...
                    </Text>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SearchResults;
