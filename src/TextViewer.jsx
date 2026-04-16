import { useState, useEffect, useRef } from 'react';
import { Button, Text } from '@fluentui/react-components';
import { ChevronDownRegular, ChevronLeftRegular, ChevronRightRegular, DocumentTextRegular } from '@fluentui/react-icons';
import TextViewerToolbar from './components/TextViewerToolbar';
import TextViewerTopBar from './components/TextViewerTopBar';
import TextViewerLinksPanel from './components/TextViewerLinksPanel';
import TextNotesPanel from './components/TextNotesPanel';
import TextContextMenu from './components/TextContextMenu';
import { convertOtzariaBookToText } from './utils/otzariaIntegration';
import './TextViewer.css';

const TextViewer = ({ textPath, searchContext, isPreviewMode = false, bookId = null, bookType = null, onLinkClick = null, onSearchRequest = null, onHistoryClick }) => {
    const [htmlContent, setHtmlContent] = useState('');
    const [pages, setPages] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [bookName, setBookName] = useState('');
    const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
    const [fontSize, setFontSize] = useState(24);
    const [columnCount, setColumnCount] = useState(1); // ברירת מחדל: טור אחד
    const [outline, setOutline] = useState([]);
    const [isOutlineOpen, setIsOutlineOpen] = useState(false);
    const [expandedItems, setExpandedItems] = useState(new Set()); // פריטים מורחבים
    const [outlineSearchQuery, setOutlineSearchQuery] = useState(''); // חיפוש בתוכן עניינים
    const scrollContainerRef = useRef(null);
    const [displayedLines, setDisplayedLines] = useState(50); // מספר שורות מוצגות
    const [allLines, setAllLines] = useState([]); // כל השורות של הספר
    const [isWideView, setIsWideView] = useState(true); // מצב רווחים מורחבים - ברירת מחדל ללא רווח
    const [isLinksOpen, setIsLinksOpen] = useState(false); // פאנל קישורים
    const [isCommentariesOpen, setIsCommentariesOpen] = useState(false); // פאנל מפרשים
    const [isNotesOpen, setIsNotesOpen] = useState(false); // פאנל הערות אישיות
    const [currentLineIndex, setCurrentLineIndex] = useState(0); // השורה הנוכחית שהמשתמש רואה
    const [currentHeadingPath, setCurrentHeadingPath] = useState([]); // נתיב הכותרות הנוכחי (היררכיה מלאה)
    const lastHeadingUpdateRef = useRef(0); // זמן העדכון האחרון של הכותרת
    const isNavigatingRef = useRef(false); // דגל שמציין שאנחנו בתהליך ניווט
    const [contextMenu, setContextMenu] = useState(null); // תפריט הקשר
    const [searchQuery, setSearchQuery] = useState(''); // שאילתת חיפוש
    const [searchResults, setSearchResults] = useState([]); // תוצאות חיפוש
    const [currentSearchIndex, setCurrentSearchIndex] = useState(-1); // אינדקס התוצאה הנוכחית

    useEffect(() => {
        const loadTextFile = async () => {
            try {
                setLoading(true);
                
                console.log('📖 TextViewer: טוען ספר');
                console.log('   bookId:', bookId);
                console.log('   bookType:', bookType);
                console.log('   searchContext:', searchContext);
                
                let htmlText;
                let fileName;
                
                // בדיקה אם זה ספר אוצריא
                if (bookType === 'otzaria' && bookId) {
                    console.log('📖 טוען ספר אוצריא:', bookId);
                    const bookData = convertOtzariaBookToText(bookId);
                    
                    if (!bookData) {
                        console.error('❌ לא ניתן לטעון ספר אוצריא');
                        setLoading(false);
                        return;
                    }
                    
                    setBookName(bookData.title);
                    htmlText = bookData.content;
                    console.log('✅ ספר אוצריא נטען:', bookData.totalLines, 'שורות');
                } else if (textPath && !textPath.startsWith('virtual-otzaria')) {
                    // טעינת קובץ טקסט רגיל - רק אם זה לא נתיב וירטואלי של אוצריא
                    // חילוץ שם הספר מהנתיב
                    fileName = textPath.split(/[/\\]/).pop(); // קבלת שם הקובץ
                    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, ''); // הסרת הסיומת
                    setBookName(nameWithoutExt);
                    
                    // בדיקה אם אנחנו ב-Electron או Tauri
                    const isElectron = window.electron !== undefined;
                    const isTauri = window.__TAURI__ !== undefined;
                    
                    if (isTauri) {
                        // קריאת קובץ דרך Tauri API
                        try {
                            const { invoke } = await import('@tauri-apps/api/tauri');
                            htmlText = await invoke('read_text_file', { path: textPath });
                            console.log('✅ קובץ נטען דרך Tauri:', textPath);
                        } catch (error) {
                            console.error('❌ שגיאה בקריאת קובץ דרך Tauri:', error);
                            throw error;
                        }
                    } else if (isElectron) {
                        // קריאת קובץ דרך Electron API
                        htmlText = window.electron.readFile(textPath);
                    } else {
                        // קריאת קובץ רגילה (development mode)
                        const response = await fetch(textPath);
                        htmlText = await response.text();
                    }
                    
                    // המר כל מעבר שורה ל-<br> כדי לשמור על מעברי השורות
                    htmlText = htmlText
                        .replace(/\r\n/g, '\n') // המרת Windows line endings
                        .replace(/\r/g, '\n')   // המרת Mac line endings
                        .replace(/\n/g, '<br>\n'); // המר כל מעבר שורה ל-<br>
                } else {
                    console.error('❌ לא סופק textPath או bookId');
                    setLoading(false);
                    return;
                }
                
                // אם יש חיפוש, הדגש את המילים
                if (searchContext && searchContext.searchQuery) {
                    const query = searchContext.searchQuery;
                    const regex = new RegExp(`(${query})`, 'gi');
                    htmlText = htmlText.replace(regex, '<mark class="search-highlight">$1</mark>');
                }
                
                setHtmlContent(htmlText);

                // חלוקה לשורות
                const lines = htmlText.split('<br>').filter(line => line.trim());
                setAllLines(lines);
                setPages([htmlText]); // שמירה על התוכן המלא לצורך תאימות
                
                // חילוץ תוכן עניינים מהטקסט
                extractOutline(htmlText);
                
                // אם יש מיקום ספציפי, נווט אליו
                if (searchContext && searchContext.context) {
                    if (searchContext.context.lineIndex !== undefined) {
                        // ניווט לשורה ספציפית
                        const targetLine = searchContext.context.lineIndex;
                        console.log('📍 ניווט לשורה:', targetLine, 'מתוך', lines.length, 'שורות');
                        
                        // וודא שהשורה נטענה - טען עד השורה + 100 שורות נוספות
                        const linesToLoad = Math.min(targetLine + 100, lines.length);
                        console.log('📊 טוען', linesToLoad, 'שורות');
                        setDisplayedLines(linesToLoad);
                        
                        // המתן לרינדור ואז נווט
                        setTimeout(() => {
                            const lineElement = document.getElementById(`line-${targetLine}`);
                            console.log('🔍 מחפש אלמנט:', `line-${targetLine}`, lineElement ? 'נמצא' : 'לא נמצא');
                            if (lineElement) {
                                lineElement.scrollIntoView({ behavior: 'auto', block: 'start' });
                                // הדגש את השורה
                                lineElement.classList.add('temp-line-highlight');
                                setTimeout(() => {
                                    lineElement.classList.remove('temp-line-highlight');
                                }, 2000);
                                console.log('✅ ניווט הושלם לשורה', targetLine);
                            } else {
                                console.error('❌ לא נמצא אלמנט לשורה', targetLine);
                            }
                        }, 300);
                        
                        setCurrentLineIndex(targetLine);
                    } else {
                        console.log('📄 TextViewer: יש הקשר חיפוש אבל אין lineIndex');
                    }
                } else {
                    console.log('📄 TextViewer: אין הקשר חיפוש');
                    setCurrentPage(0);
                    setCurrentLineIndex(0);
                }

                console.log('סך כל השורות:', lines.length);
            } catch (error) {
                console.error('שגיאה בטעינת קובץ הטקסט:', error);
            } finally {
                setLoading(false);
            }
        };

        if (textPath || (bookType === 'otzaria' && bookId)) {
            loadTextFile();
        }
    }, [textPath, searchContext?.context?.lineIndex, searchContext?.searchQuery, bookId, bookType]);

    // סגור תפריט הקשר בלחיצה או בגלילה
    useEffect(() => {
        const handleClickOutside = () => {
            if (contextMenu) {
                setContextMenu(null);
            }
        };

        if (contextMenu) {
            document.addEventListener('click', handleClickOutside);
            document.addEventListener('scroll', handleClickOutside, true);
            
            return () => {
                document.removeEventListener('click', handleClickOutside);
                document.removeEventListener('scroll', handleClickOutside, true);
            };
        }
    }, [contextMenu]);

    // פונקציה למציאת השורה הנוכחית שנמצאת בראש המסך
    const findCurrentLineIndex = () => {
        if (!scrollContainerRef.current) return 0;
        
        const container = scrollContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const containerTop = containerRect.top;
        
        // עבור על כל השורות המוצגות ומצא את הראשונה שנראית
        for (let i = 0; i < displayedLines; i++) {
            const lineElement = document.getElementById(`line-${i}`);
            if (lineElement) {
                const lineRect = lineElement.getBoundingClientRect();
                // אם השורה נמצאת בתוך או מתחת לראש המסך
                if (lineRect.bottom > containerTop + 50) { // 50px offset מהראש
                    return i;
                }
            }
        }
        
        return 0;
    };
    
    // פונקציה לטעינת שורות נוספות בגלילה ומעקב אחרי השורה הנוכחית
    const handleScroll = (e) => {
        const element = e.target;
        const scrollPercentage = (element.scrollTop + element.clientHeight) / element.scrollHeight;
        
        // כאשר מגיעים ל-80% מהגלילה, טען עוד 50 שורות
        if (scrollPercentage > 0.8 && displayedLines < allLines.length) {
            setDisplayedLines(prev => Math.min(prev + 50, allLines.length));
        }
        
        // אם אנחנו בתהליך ניווט, אל תעדכן את הכותרת
        if (isNavigatingRef.current) {
            return;
        }
        
        // Throttle - עדכן כותרת רק פעם ב-300ms
        const now = Date.now();
        if (now - lastHeadingUpdateRef.current < 300) {
            return;
        }
        lastHeadingUpdateRef.current = now;
        
        // מצא את השורה הנוכחית בצורה מדויקת
        const newLineIndex = findCurrentLineIndex();
        
        // עדכן את השורה הנוכחית רק אם השתנתה משמעותית
        if (Math.abs(newLineIndex - currentLineIndex) > 5) {
            setCurrentLineIndex(newLineIndex);
            updateCurrentHeading(newLineIndex);
        }
    };
    
    // פונקציה לעדכון הכותרת הנוכחית בהתאם לשורה
    const updateCurrentHeading = (lineIndex) => {
        if (outline.length === 0) {
            setCurrentHeadingPath([]);
            return;
        }
        
        // פונקציה רקורסיבית למציאת נתיב הכותרות
        const findHeadingPath = (items, targetLine) => {
            let bestMatch = null;
            let bestMatchDistance = Infinity;
            
            // מצא את הכותרת הכי קרובה שעברה
            for (const item of items) {
                if (item.lineIndex <= targetLine) {
                    const distance = targetLine - item.lineIndex;
                    if (distance < bestMatchDistance) {
                        bestMatch = item;
                        bestMatchDistance = distance;
                    }
                }
            }
            
            if (!bestMatch) {
                return [];
            }
            
            // התחל את הנתיב עם הכותרת שמצאנו
            let path = [{ title: bestMatch.title, lineIndex: bestMatch.lineIndex }];
            
            // אם יש ילדים, חפש בהם רקורסיבית
            if (bestMatch.children && bestMatch.children.length > 0) {
                const childPath = findHeadingPath(bestMatch.children, targetLine);
                if (childPath.length > 0) {
                    path = [...path, ...childPath];
                }
            }
            
            return path;
        };
        
        const headingPath = findHeadingPath(outline, lineIndex);
        
        // עדכן רק אם הנתיב השתנה
        const currentPathStr = currentHeadingPath.map(h => h.title).join('›');
        const newPathStr = headingPath.map(h => h.title).join('›');
        
        if (currentPathStr !== newPathStr) {
            console.log('📍 עדכון היררכיה לשורה', lineIndex, ':', newPathStr);
            setCurrentHeadingPath(headingPath);
        }
    };

    // פונקציה לחילוץ תוכן עניינים מהטקסט
    const extractOutline = (htmlText) => {
        try {
            console.log('🔍 Starting outline extraction...');
            console.log('📄 Text length:', htmlText.length);
            
            const outlineItems = [];
            let itemId = 0;
            
            // חפש את כל תגיות הכותרת בטקסט המלא (לא רק בשורות)
            const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
            let match;
            let matchCount = 0;
            
            while ((match = headingRegex.exec(htmlText)) !== null) {
                matchCount++;
                const level = parseInt(match[1]);
                const title = match[2].replace(/<[^>]*>/g, '').trim();
                
                if (title.length > 0) {
                    // חשב באיזו שורה הכותרת נמצאת
                    const textBeforeHeading = htmlText.substring(0, match.index);
                    const lineIndex = (textBeforeHeading.match(/<br>/gi) || []).length;
                    
                    outlineItems.push({
                        id: itemId++,
                        title: title,
                        level: level,
                        lineIndex: lineIndex,
                        children: []
                    });
                }
            }
            
            console.log('📖 Found', matchCount, 'heading tags');
            console.log('📖 Valid headings:', outlineItems.length);
            
            // בנה היררכיה
            const buildHierarchy = (items) => {
                const root = [];
                const stack = [];
                
                items.forEach(item => {
                    // מצא את ההורה המתאים (הכותרת הקרובה ביותר ברמה נמוכה יותר)
                    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
                        stack.pop();
                    }
                    
                    if (stack.length === 0) {
                        // פריט ברמה הראשית
                        root.push(item);
                    } else {
                        // הוסף כילד להורה
                        stack[stack.length - 1].children.push(item);
                    }
                    
                    stack.push(item);
                });
                
                return root;
            };
            
            const hierarchicalOutline = buildHierarchy(outlineItems);
            setOutline(hierarchicalOutline);
            
            console.log('✅ Final outline with', outlineItems.length, 'items');
            if (outlineItems.length > 0) {
                console.log('📖 First 5 items:', outlineItems.slice(0, 5).map(item => `[${item.level}] ${item.title}`));
                // עדכן את הכותרת הראשונית
                if (hierarchicalOutline.length > 0) {
                    setCurrentHeadingPath([{ 
                        title: hierarchicalOutline[0].title, 
                        lineIndex: hierarchicalOutline[0].lineIndex 
                    }]);
                }
            } else {
                console.log('⚠️ No heading tags found in HTML');
            }
        } catch (error) {
            console.error('❌ Error extracting outline:', error);
            setOutline([]);
        }
    };

    // טיפול בהרחבה/צמצום של פריט
    const toggleExpand = (itemId) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };
    
    // הרחב/צמצם את כל הפריטים
    const toggleExpandAll = () => {
        if (expandedItems.size > 0) {
            // אם יש פריטים מורחבים, צמצם הכל
            setExpandedItems(new Set());
        } else {
            // אם הכל מצומצם, הרחב הכל
            const allIds = new Set();
            const collectIds = (items) => {
                items.forEach(item => {
                    if (item.children && item.children.length > 0) {
                        allIds.add(item.id);
                        collectIds(item.children);
                    }
                });
            };
            collectIds(outline);
            setExpandedItems(allIds);
        }
    };

    // רנדור רקורסיבי של פריטי תוכן עניינים
    const renderOutlineItem = (item, depth = 0) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems.has(item.id);
        
        // בדוק אם הפריט הזה תואם לחיפוש
        const matchesSearch = !outlineSearchQuery || 
            item.title.toLowerCase().includes(outlineSearchQuery.toLowerCase());
        
        // בדוק אם יש ילדים שתואמים (רקורסיבית)
        const hasMatchingChildren = (node) => {
            if (!node.children || node.children.length === 0) return false;
            
            return node.children.some(child => {
                const childMatches = child.title.toLowerCase().includes(outlineSearchQuery.toLowerCase());
                return childMatches || hasMatchingChildren(child);
            });
        };
        
        const childrenMatch = hasChildren && hasMatchingChildren(item);
        
        // אם לא תואם ואין ילדים תואמים, אל תציג
        if (!matchesSearch && !childrenMatch) {
            return null;
        }
        
        // אם יש חיפוש ויש ילדים תואמים, הרחב אוטומטית
        const shouldExpand = outlineSearchQuery && childrenMatch ? true : isExpanded;
        
        return (
            <div key={item.id}>
                <div
                    className={`outline-item outline-level-${item.level} ${matchesSearch ? 'outline-match' : ''}`}
                    style={{ paddingRight: `${depth * 12 + 8}px` }}
                >
                    {hasChildren && (
                        <button
                            className="outline-expand-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(item.id);
                            }}
                            title={isExpanded ? 'צמצם' : 'הרחב'}
                        >
                            {shouldExpand ? <ChevronDownRegular /> : <ChevronLeftRegular />}
                        </button>
                    )}
                    {!hasChildren && (
                        <span className="outline-item-icon">
                            <DocumentTextRegular />
                        </span>
                    )}
                    <span
                        className="outline-item-text"
                        onClick={() => navigateToOutlineItem(item.lineIndex)}
                        title={item.title}
                    >
                        {item.title}
                    </span>
                </div>
                {hasChildren && shouldExpand && (
                    <div className="outline-children">
                        {item.children.map(child => renderOutlineItem(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    // ניווט לשורה מתוכן העניינים
    const navigateToOutlineItem = (lineIndex) => {
        if (scrollContainerRef.current && allLines.length > 0) {
            // וודא שהשורה נטענה
            if (lineIndex >= displayedLines) {
                // טען עד השורה הנדרשת + 50 שורות נוספות
                setDisplayedLines(Math.min(lineIndex + 50, allLines.length));
                
                // המתן לרינדור ואז נווט
                setTimeout(() => {
                    const lineElement = document.getElementById(`line-${lineIndex}`);
                    if (lineElement) {
                        lineElement.scrollIntoView({ behavior: 'auto', block: 'start' });
                        console.log('📍 Navigated to line:', lineIndex);
                    }
                }, 100);
            } else {
                // השורה כבר נטענה, נווט ישירות ללא אנימציה
                const lineElement = document.getElementById(`line-${lineIndex}`);
                if (lineElement) {
                    lineElement.scrollIntoView({ behavior: 'auto', block: 'start' });
                    console.log('📍 Navigated to line:', lineIndex);
                } else {
                    console.warn('⚠️ Line element not found:', lineIndex);
                }
            }
        }
    };
    
    // טיפול בלחיצה על כותרת בסרגל העליון
    const handleHeadingClick = (lineIndex) => {
        console.log('🔗 לחיצה על כותרת, ניווט לשורה:', lineIndex);
        
        // סמן שאנחנו בתהליך ניווט
        isNavigatingRef.current = true;
        
        // עדכן את השורה הנוכחית
        setCurrentLineIndex(lineIndex);
        
        // עדכן את ההיררכיה מיד לפי השורה החדשה
        updateCurrentHeading(lineIndex);
        
        // נווט לשורה
        navigateToOutlineItem(lineIndex);
        
        // אחרי הניווט, וודא שההיררכיה מעודכנת לפי המיקום האמיתי
        setTimeout(() => {
            const actualLineIndex = findCurrentLineIndex();
            console.log('📍 מיקום אמיתי אחרי ניווט:', actualLineIndex);
            setCurrentLineIndex(actualLineIndex);
            updateCurrentHeading(actualLineIndex);
            isNavigatingRef.current = false;
        }, 200);
    };

    if (loading) {
        return (
            <div className="text-viewer-container">
                <div className="text-viewer-loading">
                    <Text size={400}>טוען קובץ טקסט...</Text>
                </div>
            </div>
        );
    }

    if (!pages.length) {
        return (
            <div className="text-viewer-container">
                <div className="text-viewer-empty">
                    <Text size={400}>לא ניתן לטעון את קובץ הטקסט</Text>
                </div>
            </div>
        );
    }

    const handleNotesClick = () => {
        console.log('📝 פתיחת פאנל הערות אישיות');
        setIsNotesOpen(!isNotesOpen);
        // סגור את הפאנלים האחרים
        setIsLinksOpen(false);
        setIsCommentariesOpen(false);
    };

    const handleCommentariesClick = () => {
        console.log('📖 פתיחת פאנל מפרשים');
        setIsCommentariesOpen(!isCommentariesOpen);
        // סגור את הפאנלים האחרים
        setIsLinksOpen(false);
        setIsNotesOpen(false);
    };

    const handleLinksClick = () => {
        console.log('🔗 פתיחת פאנל קישורים');
        setIsLinksOpen(!isLinksOpen);
        // סגור את הפאנלים האחרים
        setIsCommentariesOpen(false);
        setIsNotesOpen(false);
    };

    const handleLinkClick = (linkedBook) => {
        console.log('🔗 נלחץ על קישור:', linkedBook);
        // סגור את כל הפאנלים
        setIsLinksOpen(false);
        setIsCommentariesOpen(false);
        setIsNotesOpen(false);
        // פתח את הספר המקושר בשורה הספציפית
        if (onLinkClick) {
            // הכן את ה-searchContext בנפרד מה-targetLineIndex
            const searchContext = linkedBook.targetLineIndex !== null && linkedBook.targetLineIndex !== undefined
                ? {
                    context: {
                        lineIndex: linkedBook.targetLineIndex
                    }
                }
                : null;
            
            console.log('📤 קורא ל-onLinkClick עם:', linkedBook, 'ו-searchContext:', searchContext);
            
            // קרא ל-handleFileClick עם שני פרמטרים נפרדים
            onLinkClick(linkedBook, searchContext);
        }
    };

    const handleBookmarkClick = () => {
        console.log('Bookmark clicked');
        // TODO: Implement bookmark functionality
    };

    const handleFontSizeChange = (action) => {
        if (action === 'increase') {
            setFontSize(prev => Math.min(prev + 2, 36));
        } else if (action === 'decrease') {
            setFontSize(prev => Math.max(prev - 2, 16));
        }
    };

    const handleColumnChange = (columns) => {
        setColumnCount(columns);
    };

    const handleSearch = (query) => {
        console.log('Search for:', query);
        
        if (!query || !query.trim()) {
            // אם אין שאילתה, נקה את החיפוש
            setSearchQuery('');
            setSearchResults([]);
            setCurrentSearchIndex(-1);
            // הסר הדגשות
            removeSearchHighlights();
            return;
        }
        
        setSearchQuery(query);
        
        // חפש את השאילתה בכל השורות
        const results = [];
        const searchTerm = query.trim();
        const regex = new RegExp(searchTerm, 'gi');
        
        allLines.forEach((line, index) => {
            // הסר תגיות HTML לחיפוש
            const plainText = line.replace(/<[^>]*>/g, '');
            
            if (regex.test(plainText)) {
                results.push({
                    lineIndex: index,
                    line: plainText,
                    matches: [...plainText.matchAll(new RegExp(searchTerm, 'gi'))].length
                });
            }
        });
        
        console.log(`🔍 נמצאו ${results.length} תוצאות עבור "${searchTerm}"`);
        
        // עדכן את התוצאות - גם אם אין תוצאות (כדי לנקות תוצאות קודמות)
        setSearchResults(results);
        
        if (results.length > 0) {
            // עבור לתוצאה הראשונה
            setCurrentSearchIndex(0);
            navigateToSearchResult(results[0].lineIndex, searchTerm);
        } else {
            // אין תוצאות - נקה הכל
            setCurrentSearchIndex(-1);
            removeSearchHighlights();
        }
    };
    
    const navigateToSearchResult = (lineIndex, searchTerm) => {
        // וודא שהשורה נטענה
        if (lineIndex >= displayedLines) {
            setDisplayedLines(Math.min(lineIndex + 50, allLines.length));
        }
        
        // המתן לרינדור ואז נווט
        setTimeout(() => {
            const lineElement = document.getElementById(`line-${lineIndex}`);
            if (lineElement) {
                lineElement.scrollIntoView({ behavior: 'auto', block: 'center' });
                
                // הדגש את התוצאה
                highlightSearchResults(searchTerm);
                
                // הדגש את השורה הנוכחית
                lineElement.classList.add('temp-line-highlight');
                setTimeout(() => {
                    lineElement.classList.remove('temp-line-highlight');
                }, 2000);
            }
        }, 100);
    };
    
    const highlightSearchResults = (searchTerm) => {
        if (!searchTerm) return;
        
        // הסר הדגשות קודמות
        removeSearchHighlights();
        
        // הוסף הדגשות חדשות
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        
        for (let i = 0; i < displayedLines; i++) {
            const lineElement = document.getElementById(`line-${i}`);
            if (lineElement) {
                const originalHTML = lineElement.innerHTML;
                const highlightedHTML = originalHTML.replace(regex, '<mark class="text-search-highlight">$1</mark>');
                if (originalHTML !== highlightedHTML) {
                    lineElement.innerHTML = highlightedHTML;
                }
            }
        }
    };
    
    const removeSearchHighlights = () => {
        const highlights = document.querySelectorAll('.text-search-highlight');
        highlights.forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
    };
    
    const handleNextSearchResult = () => {
        if (searchResults.length === 0) return;
        
        const nextIndex = (currentSearchIndex + 1) % searchResults.length;
        setCurrentSearchIndex(nextIndex);
        navigateToSearchResult(searchResults[nextIndex].lineIndex, searchQuery);
    };
    
    const handlePrevSearchResult = () => {
        if (searchResults.length === 0) return;
        
        const prevIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
        setCurrentSearchIndex(prevIndex);
        navigateToSearchResult(searchResults[prevIndex].lineIndex, searchQuery);
    };
    
    const handleCloseSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setCurrentSearchIndex(-1);
        removeSearchHighlights();
    };

    const handleToggleWideView = (wideView) => {
        setIsWideView(wideView);
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY
        });
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    const handleContextSearch = (searchText) => {
        console.log('Search from context menu:', searchText);
        // פתח את תיבת החיפוש ומלא אותה בטקסט
        setSearchQuery(searchText);
        handleSearch(searchText);
    };

    const handleContextLocateBook = (searchText) => {
        console.log('🔍 אתר ספר מתפריט הקשר:', searchText);
        
        if (!searchText || !searchText.trim()) {
            console.warn('⚠️ אין טקסט לחיפוש');
            return;
        }
        
        // סגור את תפריט ההקשר
        setContextMenu(null);
        
        // אם יש callback להורה, השתמש בו
        if (onSearchRequest) {
            onSearchRequest(searchText.trim());
        } else {
            // אחרת, נווט לדף החיפוש
            const searchUrl = `/#search?q=${encodeURIComponent(searchText.trim())}`;
            window.location.href = searchUrl;
        }
    };

    const handleContextNotes = (selectedText) => {
        console.log('Add note from context menu:', selectedText);
        setIsNotesOpen(true);
        setIsLinksOpen(false);
        setIsCommentariesOpen(false);
    };

    return (
        <div className="text-viewer-container" style={{ height: '100%', width: '100%' }}>
            {!isPreviewMode && bookName && (
                <TextViewerTopBar
                    isToolbarCollapsed={isToolbarCollapsed}
                    onToggleToolbar={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
                    onZoomIn={() => handleFontSizeChange('increase')}
                    onZoomOut={() => handleFontSizeChange('decrease')}
                    onSearch={handleSearch}
                    onToggleOutline={() => setIsOutlineOpen(!isOutlineOpen)}
                    outlineCount={outline.length}
                    bookName={bookName}
                    currentHeadingPath={currentHeadingPath}
                    onHeadingClick={handleHeadingClick}
                    searchQuery={searchQuery}
                    searchResults={searchResults}
                    currentSearchIndex={currentSearchIndex}
                    onNextSearchResult={handleNextSearchResult}
                    onPrevSearchResult={handlePrevSearchResult}
                    onCloseSearch={handleCloseSearch}
                    onHistoryClick={onHistoryClick}
                />
            )}
            
            <div className="text-viewer-content" style={{ height: isPreviewMode ? '100%' : 'auto', width: '100%' }}>
                <div className="text-viewer-layout" style={{ height: '100%' }}>
                            {/* חלונית תוכן עניינים */}
                            {isOutlineOpen && (
                                <div className="text-outline-sidebar">
                                    <div className="outline-toolbar">
                                        <input
                                            type="text"
                                            className="outline-search-input"
                                            placeholder="חפש כותרת..."
                                            value={outlineSearchQuery}
                                            onChange={(e) => setOutlineSearchQuery(e.target.value)}
                                        />
                                        <button
                                            className="outline-expand-all-btn"
                                            onClick={toggleExpandAll}
                                            title={expandedItems.size > 0 ? 'צמצם הכל' : 'הרחב הכל'}
                                        >
                                            {expandedItems.size > 0 ? <ChevronDownRegular /> : <ChevronRightRegular />}
                                        </button>
                                    </div>
                                    <div className="outline-content">
                                        {outline.length > 0 ? (
                                            outline.map(item => renderOutlineItem(item, 0))
                                        ) : (
                                            <div style={{ padding: '20px', textAlign: 'center' }}>
                                                <Text size={300}>לא נמצאו כותרות בקובץ זה</Text>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <div className="text-viewer" style={{ height: '100%', width: '100%' }}>
                                {loading ? (
                                    <div className="text-viewer-skeleton">
                                        <div className="skeleton-page">
                                            <div className="skeleton-header">
                                                <div className="skeleton-title"></div>
                                            </div>
                                            <div className="skeleton-content">
                                                {[...Array(20)].map((_, i) => (
                                                    <div key={i} className="skeleton-line" style={{
                                                        width: `${Math.random() * 20 + 75}%`,
                                                        animationDelay: `${i * 0.05}s`
                                                    }}></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                {/* תוכן הטקסט - תצוגה רציפה */}
                                <div 
                                    className={`text-content-scroll ${isWideView ? 'wide-view' : ''}`}
                                    ref={scrollContainerRef}
                                    onScroll={handleScroll}
                                    onContextMenu={handleContextMenu}
                                    style={{ height: '100%', overflow: 'auto' }}
                                >
                                    <div 
                                        className="continuous-text-container"
                                        style={{
                                            margin: isWideView ? '0' : '20px auto',
                                            maxWidth: isWideView ? '100%' : '900px'
                                        }}
                                    >
                                        <div 
                                            className="page-content"
                                        >
                                            {/* תוכן רציף */}
                                            <div
                                                className="text-content-continuous"
                                                style={{
                                                    fontSize: `${fontSize}px`
                                                }}
                                            >
                                                {allLines.slice(0, displayedLines).map((line, index) => (
                                                    <div 
                                                        key={index} 
                                                        id={`line-${index}`}
                                                        className="text-line"
                                                        dangerouslySetInnerHTML={{ __html: line }}
                                                        style={{ 
                                                            minHeight: `${fontSize * 1.8}px`,
                                                            lineHeight: 1.8,
                                                            cursor: bookType === 'otzaria' ? 'pointer' : 'default'
                                                        }}
                                                        onClick={() => {
                                                            if (bookType === 'otzaria') {
                                                                setCurrentLineIndex(index);
                                                                console.log(`📍 נבחרה שורה ${index}`);
                                                            }
                                                        }}
                                                        title={bookType === 'otzaria' ? `שורה ${index + 1} - לחץ לראות מפרשים וקישורים` : ''}
                                                    />
                                                ))}
                                            </div>
                                            {displayedLines < allLines.length && (
                                                <div className="loading-more">
                                                    טוען עוד תוכן...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                    </>
                                )}
                            </div>
                            
                            {/* פאנל מפרשים - רק לספרי אוצריא */}
                            {bookType === 'otzaria' && bookId && (
                                <TextViewerLinksPanel
                                    bookId={bookId}
                                    currentLineIndex={currentLineIndex}
                                    isOpen={isCommentariesOpen}
                                    onClose={() => setIsCommentariesOpen(false)}
                                    onLinkClick={handleLinkClick}
                                    panelType="commentaries"
                                />
                            )}
                            
                            {/* פאנל קישורים - רק לספרי אוצריא */}
                            {bookType === 'otzaria' && bookId && (
                                <TextViewerLinksPanel
                                    bookId={bookId}
                                    currentLineIndex={currentLineIndex}
                                    isOpen={isLinksOpen}
                                    onClose={() => setIsLinksOpen(false)}
                                    onLinkClick={handleLinkClick}
                                    panelType="links"
                                />
                            )}
                            
                            {/* פאנל הערות אישיות - לכל סוגי הספרים */}
                            {isNotesOpen && (
                                <TextNotesPanel
                                    bookName={bookName}
                                    currentLineIndex={currentLineIndex}
                                    onClose={() => setIsNotesOpen(false)}
                                />
                            )}
                            
                            {!isPreviewMode && (
                                <TextViewerToolbar
                                    onNotesClick={handleNotesClick}
                                    onCommentariesClick={handleCommentariesClick}
                                    onLinksClick={handleLinksClick}
                                    currentPage={1}
                                    totalPages={1}
                                    isCollapsed={isToolbarCollapsed}
                                    bookName={bookName}
                                    onFontSizeChange={handleFontSizeChange}
                                    onColumnChange={handleColumnChange}
                                    currentColumns={columnCount}
                                    onToggleWideView={handleToggleWideView}
                                    bookType={bookType}
                                    currentLineIndex={currentLineIndex}
                                />
                            )}
                </div>
            </div>
            
            {contextMenu && (
                <TextContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={handleCloseContextMenu}
                    onNotesClick={handleContextNotes}
                    onLocateBook={handleContextLocateBook}
                    onSearch={handleContextSearch}
                />
            )}
        </div>
    );
};

export default TextViewer;