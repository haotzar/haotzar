import { useState, useEffect } from 'react';
import { Button, Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions, Checkbox } from '@fluentui/react-components';
import { QuestionCircleRegular, WarningRegular } from '@fluentui/react-icons';
import { registerConfirmCallback } from '../utils/customConfirm';
import './CustomConfirm.css';

const CustomConfirm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('question'); // 'question', 'warning'
  const [buttons, setButtons] = useState(null); // כפתורים מותאמים אישית
  const [showDontShowAgain, setShowDontShowAgain] = useState(false);
  const [dontShowAgainChecked, setDontShowAgainChecked] = useState(false);
  const [resolveCallback, setResolveCallback] = useState(null);

  useEffect(() => {
    const showConfirm = (msg, options = {}) => {
      return new Promise((resolve) => {
        setMessage(msg);
        setTitle(options.title || 'אישור');
        setType(options.type || 'question');
        setButtons(options.buttons || null);
        setShowDontShowAgain(options.showDontShowAgain || false);
        setDontShowAgainChecked(false);
        setIsOpen(true);
        setResolveCallback(() => resolve);
      });
    };

    registerConfirmCallback(showConfirm);
  }, []);

  const handleButtonClick = (value) => {
    setIsOpen(false);
    if (resolveCallback) {
      resolveCallback({ value, dontShowAgain: dontShowAgainChecked });
      setResolveCallback(null);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveCallback) {
      resolveCallback({ value: false, dontShowAgain: dontShowAgainChecked });
      setResolveCallback(null);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <WarningRegular className="confirm-icon warning" />;
      default:
        return <QuestionCircleRegular className="confirm-icon question" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(e, data) => !data.open && handleCancel()}>
      <DialogSurface className="custom-confirm-surface">
        <DialogBody>
          <DialogTitle className="custom-confirm-title">
            {getIcon()}
            <span>{title}</span>
          </DialogTitle>
          <DialogContent className="custom-confirm-content">
            {message.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
            {showDontShowAgain && (
              <div className="dont-show-again-container">
                <Checkbox
                  checked={dontShowAgainChecked}
                  onChange={(e, data) => setDontShowAgainChecked(data.checked)}
                  label="אל תציג הודעה זאת שוב"
                />
              </div>
            )}
          </DialogContent>
          <DialogActions className="custom-confirm-actions">
            {buttons ? (
              buttons.map((button, index) => (
                <Button
                  key={index}
                  appearance={button.primary ? 'primary' : 'secondary'}
                  onClick={() => handleButtonClick(button.value)}
                >
                  {button.label}
                </Button>
              ))
            ) : (
              <>
                <Button appearance="secondary" onClick={handleCancel}>
                  ביטול
                </Button>
                <Button appearance="primary" onClick={() => handleButtonClick(true)}>
                  אישור
                </Button>
              </>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default CustomConfirm;
