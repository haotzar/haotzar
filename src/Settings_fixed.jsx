import {
  Button,
  Switch,
  Text,
  Field,
  Label,
  Divider,
  Card,
} from '@fluentui/react-components';
import {
  SettingsRegular,
  DarkThemeRegular,
  ColorRegular,
  ArrowDownloadRegular,
  ArrowUploadRegular,
  DeleteRegular,
  PaintBrushRegular,
  DatabaseRegular,
  InfoRegular,
  ChevronRightRegular,
  FolderAddRegular,
  FolderRegular,
  AddRegular,
  EditRegular,
  SearchRegular,
  DismissRegular,
  PersonRegular,
  AppsRegular,
  ColorFilled,
  DatabaseFilled,
  InfoFilled,
  FolderFilled,
  SearchFilled,
} from '@fluentui/react-icons';
import { useState, useEffect, useRef } from 'react';
import tantivyEngine from './utils/tantivyEngine';
import { 
  exportSettingsToFile, 
  importSettingsFromFile, 
  clearAllSettings,
  getSetting,
  updateSetting
} from './utils/settingsManager';
import customAlert from './utils/customAlert';
import customConfirm from './utils/customConfirm';
import './Settings.css';

const Settings = ({ isDark, setIsDark, onNavigateToMetadata }) => {
  const [activeSection, setActiveSection] = useState('personalization');
  const [selectedColor, setSelectedColor] = useState(() => getSetting('accentColor', '#5c3d2e'));
  const [libraryFolders, setLibraryFolders] = useState(() => getSetting('libraryFolders', ['books']));
  const [backgroundMode, setBackgroundMode] = useState(() => getSetting('backgroundMode', 'none'));

  // state לבניית אינדקס
  const [indexFolder, setIndexFolder] = useState('');
  const [indexName, setIndexName] = useState('books');
  const [indexType, setIndexType] = useState('pdf');
  const [otzariaDbPath, setOtzariaDbPath] = useState('');
  const [indexBuilding, setIndexBuilding] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);
  const [indexStatus, setIndexStatus] = useState('');
  const [indexDone, setIndexDone] = useState(false);
  const [indexLogs, setIndexLogs] = useState([]);
  const [canCancelIndex, setCanCancelIndex] = useState(false);

  const colorOptions = [
    { name: 'חום קלאסי', value: '#5c3d2e' },
    { name: 'כחול', value: '#0078d4' },
    { name: 'ירוק', value: '#107c10' },
    { name: 'אדום', value: '#d13438' },
    { name: 'כתום', value: '#ff8c00' },
    { name: 'סגול', value: '#5c2d91' },
  ];

  const handleColorChange = (color) => {
    setSelectedColor(color.value);
    updateSetting('accentColor', color.value);
    
    const root = document.documentElement;
    root.style.setProperty('--colorBrandBackground', color.value);
    root.style.setProperty('--colorBrandBackgroundHover', color.value);
    root.style.setProperty('--colorBrandBackgroundPressed', color.value);
    root.style.setProperty('--colorBrandBackgroundSelected', color.value);
    root.style.setProperty('--colorBrandForeground1', color.value);
    root.style.setProperty('--colorBrandForeground2', color.value);
    root.style.setProperty('--colorBrandStroke1', color.value);
    root.style.setProperty('--colorBrandStroke2', color.value);
  };

  const handleBackgroundModeChange = (mode) => {
    setBackgroundMode(mode);
    updateSetting('backgroundMode', mode);
    
    const root = document.documentElement;
    if (mode === 'none') {
      root.style.setProperty('--show-background-image', 'none');
      root.style.setProperty('--appBackgroundColor', '#ffffff');
      root.style.setProperty('--appBackgroundColorSecondary', '#f5f5f5');
      document.body.classList.remove('with-background');
    } else {
      root.style.setProperty('--show-background-image', 'block');
      root.style.setProperty('--appBackgroundColor', '#f7ead8');
      root.style.setProperty('--appBackgroundColorSecondary', '#f0e3d0');
      document.body.classList.add('with-background');
    }
  };
