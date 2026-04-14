import { useState, useEffect } from 'react';
import { Button, Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions } from '@fluentui/react-components';
import { DismissRegular, InfoRegular, WarningRegular, CheckmarkCircleRegular } from '@fluentui/react-icons';
import { registerAlertCallback } from '../utils/customAlert';
import './CustomAlert.css';

const CustomAlert = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('info'); // 'info', 'success', 'warning', 'error'
  const [resolveCallback, setResolveCallback] = useState(null);

  useEffect(() => {
    const showAlert = (msg, options = {}) => {
      return new Promise((resolve) => {
        setMessage(msg);
        setTitle(options.title || 'הודעה');
        setType(options.type || 'info');
        setIsOpen(true);
        setResolveCallback(() => resolve);
      });
    };

    registerAlertCallback(showAlert);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (resolveCallback) {
      resolveCallback(true);
      setResolveCallback(null);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckmarkCircleRegular className="alert-icon success" />;
      case 'warning':
        return <WarningRegular className="alert-icon warning" />;
      case 'error':
        return <WarningRegular className="alert-icon error" />;
      default:
        return <InfoRegular className="alert-icon info" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(e, data) => !data.open && handleClose()}>
      <DialogSurface className="custom-alert-surface">
        <DialogBody>
          <DialogTitle className="custom-alert-title">
            {getIcon()}
            <span>{title}</span>
          </DialogTitle>
          <DialogContent className="custom-alert-content">
            {message.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </DialogContent>
          <DialogActions className="custom-alert-actions">
            <Button appearance="primary" onClick={handleClose}>
              אישור
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default CustomAlert;
