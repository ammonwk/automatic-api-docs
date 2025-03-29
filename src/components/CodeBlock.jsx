import { useState, useEffect, useRef, useCallback } from 'react';
import ClipboardJS from 'clipboard';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'; // Use Light build
// Import specific languages to reduce bundle size
import js from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash'; // For cURL
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
// Choose a style
import { githubGist as lightStyle } from 'react-syntax-highlighter/dist/esm/styles/hljs'; // Light theme
import { atomOneDark as darkStyle } from 'react-syntax-highlighter/dist/esm/styles/hljs'; // Dark theme

// Register languages
SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('bash', bash); // Use bash for cURL
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('curl', bash); // Alias curl to bash

function CodeBlock({ languages = [], defaultLanguage = 'curl', isResponse = false }) {
  // Find the index of the default language, fallback to 0
  const defaultIndex = Math.max(0, languages.findIndex(lang => lang.name.toLowerCase() === defaultLanguage.toLowerCase()));
  const [activeTab, setActiveTab] = useState(defaultIndex);
  const [copySuccess, setCopySuccess] = useState(false);
  const codeBlockRef = useRef(null);
  const clipboardRef = useRef(null);

  // Determine theme based on body class
  const [isDarkMode, setIsDarkMode] = useState(document.body.classList.contains('dark-mode'));

  useEffect(() => {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.body.classList.contains('dark-mode'));
        }
      });
    });
    observer.observe(document.body, { attributes: true });
    return () => observer.disconnect();
  }, []);


  // Initialize clipboard.js
  useEffect(() => {
    if (!codeBlockRef.current) return;

    // Ensure only one instance is created
    if (clipboardRef.current) {
        clipboardRef.current.destroy();
    }

    // Target the specific button within this CodeBlock instance
    const buttonSelector = `.copy-btn-${activeTab}`;
    clipboardRef.current = new ClipboardJS(buttonSelector, {
        target: trigger => trigger.closest('.code-content').querySelector('code')
    });

    clipboardRef.current.on('success', (e) => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500); // Reset after 1.5s
      e.clearSelection();
    });

    clipboardRef.current.on('error', (e) => {
        console.error('ClipboardJS error:', e);
        // Maybe show an error tooltip/message
    });

    // Cleanup function
    return () => {
      if (clipboardRef.current) {
        clipboardRef.current.destroy();
        clipboardRef.current = null;
      }
    };
  }, [activeTab]); // Re-initialize if activeTab changes, ensuring correct target

  const handleTabClick = useCallback((index) => {
      setActiveTab(index);
      setCopySuccess(false); // Reset copy status on tab change
  }, []);

  if (!languages || languages.length === 0) {
      return null; // Don't render if no languages provided
  }

  const currentLanguage = languages[activeTab];
  // Map language names to highlighter-compatible names
  const getHighlightLanguage = (name) => {
      const lowerName = name.toLowerCase();
      if (lowerName === 'curl') return 'bash';
      if (lowerName === 'javascript') return 'javascript';
      if (lowerName === 'typescript') return 'typescript';
      if (lowerName === 'python') return 'python';
      if (lowerName === 'json') return 'json';
      return 'plaintext'; // Fallback
  };


  return (
    <div className="code-block mb-4" ref={codeBlockRef}>
      {!isResponse && languages.length > 1 && (
        <div className="example-tabs nav nav-tabs">
          {languages.map((language, index) => (
            <button
              key={language.name}
              className={`example-tab nav-link ${index === activeTab ? 'active' : ''}`}
              onClick={() => handleTabClick(index)}
              type="button"
              role="tab"
              aria-selected={index === activeTab}
            >
              {language.name}
            </button>
          ))}
        </div>
      )}

      {languages.map((language, index) => (
        <div
          key={language.name}
          className={`code-content ${index === activeTab ? '' : 'hidden'}`}
          role="tabpanel"
        >
          <div className="code-header">
            <span>{language.name}</span>
            <button
              className={`copy-btn copy-btn-${index} ${copySuccess ? 'copied' : ''}`}
              // data-clipboard-text is not needed when using target function
              title={copySuccess ? 'Copied!' : 'Copy to clipboard'}
            >
              <i className={`fas ${copySuccess ? 'fa-check' : 'fa-copy'}`}></i>
            </button>
          </div>
          <SyntaxHighlighter
            language={getHighlightLanguage(language.name)}
            style={isDarkMode ? darkStyle : lightStyle}
            customStyle={{ margin: 0, borderRadius: '0 0 5px 5px', padding: '15px', maxHeight: '400px', overflowY: 'auto' }}
            wrapLines={true}
            showLineNumbers={false} // Optional: add line numbers
          >
            {String(language.code || '')} {/* Ensure code is a string */}
          </SyntaxHighlighter>
        </div>
      ))}
    </div>
  );
}

export default CodeBlock;
