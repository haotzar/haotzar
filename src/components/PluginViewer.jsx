import { useRef, useEffect } from 'react';
import './PluginViewer.css';

const PluginViewer = ({ plugin }) => {
  const iframeRef = useRef(null);

  // יצירת תוכן ה-iframe
  const getPluginIframeContent = (plugin) => {
    if (!plugin) return '';

    let html = plugin.files.html;

    // הוספת קבצי CSS
    if (plugin.manifest.styles) {
      plugin.manifest.styles.forEach(styleFile => {
        if (plugin.files[styleFile]) {
          html = html.replace('</head>', `<style>${plugin.files[styleFile]}</style></head>`);
        }
      });
    }

    // הוספת קבצי JS
    if (plugin.manifest.scripts) {
      plugin.manifest.scripts.forEach(scriptFile => {
        if (plugin.files[scriptFile]) {
          html = html.replace('</body>', `<script>${plugin.files[scriptFile]}</script></body>`);
        }
      });
    }

    return html;
  };

  return (
    <div className="plugin-viewer-container">
      <iframe
        ref={iframeRef}
        srcDoc={getPluginIframeContent(plugin)}
        sandbox="allow-scripts"
        title={plugin.name}
        className="plugin-viewer-iframe"
      />
    </div>
  );
};

export default PluginViewer;
