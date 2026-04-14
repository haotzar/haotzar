import { useState, useEffect } from 'react';
import { Button, Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions } from '@fluentui/react-components';
import { QuestionCircleRegular, WarningRegular } from '@fluentui/react-icons';
import { registerConfirmCallback } from '../utils/customConfirm';
import './CustomConfirm.css';

const CustomConfirm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('question'); // 'question', 'warning'
  const [resolveCallback, setResolveCallback] = useState(null);

  useEffect(() => {
    const showConfirm = (msg, options = {}) => {
      return new Promise((resolve) => {
        setMessage(msg);
        setTitle(options.title || 'אישור');
        setType(options.type || 'question');
        setIsOpen(true);
        setResolveCallback(() => resolve);
      });
    };

    registerConfirmCallback(showConfirm);
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveCallback) {
      resolveCallback(true);
      setResolveCallback(null);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveCallback) {
      resolveCallback(false);
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
          </DialogContent>
          <DialogActions className="custom-confirm-actions">
            <Button appearance="secondary" onClick={handleCancel}>
              ביטול
            </Button>
            <Button appearance="primary" onClick={handleConfirm}>
              אישור
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default CustomConfirm;
