import { Tooltip } from '@fluentui/react-components';

/**
 * Wrapper component for consistent tooltip usage across the app
 * Replaces the native HTML title attribute with Fluent UI Tooltip
 */
const TooltipWrapper = ({ content, children, relationship = 'label', positioning = 'above' }) => {
  if (!content) {
    return children;
  }

  return (
    <Tooltip 
      content={content} 
      relationship={relationship}
      positioning={positioning}
    >
      {children}
    </Tooltip>
  );
};

export default TooltipWrapper;
