import { Text } from '@fluentui/react-components';
import { useState, useEffect } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ stage, progress, message }) => {
  const [isClosing, setIsClosing] = useState(false);

  // כאשר הטעינה מסתיימת, התחל fade-out
  useEffect(() => {
    if (progress >= 100) {
      setIsClosing(true);
    }
  }, [progress]);

  return (
    <div className={`splash-screen ${isClosing ? 'fade-out' : ''}`}>
      <div className="splash-content">
        <div className="splash-logo">
          <Text size={1000} weight="bold">האויצר</Text>
        </div>
        
        <div className="splash-progress-container">
          <div className="splash-progress-bar">
            <div 
              className="splash-progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <Text size={300} className="splash-progress-text">
            {Math.round(progress)}%
          </Text>
        </div>
        
        <Text size={400} className="splash-stage">
          {stage}
        </Text>
        
        {message && (
          <Text size={300} className="splash-message">
            {message}
          </Text>
        )}
      </div>
    </div>
  );
};

export default SplashScreen;
