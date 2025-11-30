import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import './DevTools.css';

const DevTools: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<Array<{ type: string; message: string; time: string }>>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [appInfo, setAppInfo] = useState<any>({});

  useEffect(() => {
    // Capture console logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      originalLog(...args);
      setLogs(prev => [...prev, { type: 'log', message: args.join(' '), time: new Date().toLocaleTimeString() }].slice(-50));
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      setLogs(prev => [...prev, { type: 'error', message: args.join(' '), time: new Date().toLocaleTimeString() }].slice(-50));
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      setLogs(prev => [...prev, { type: 'warn', message: args.join(' '), time: new Date().toLocaleTimeString() }].slice(-50));
    };

    // Get user info
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserInfo({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
          metadata: {
            creationTime: user.metadata.creationTime,
            lastSignInTime: user.metadata.lastSignInTime
          }
        });
      } else {
        setUserInfo(null);
      }
    });

    // Get app info
    setAppInfo({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      timestamp: new Date().toISOString()
    });

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      unsubscribe();
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  const clearLocalStorage = () => {
    if (window.confirm('Clear all localStorage data?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const copyUserInfo = () => {
    const info = JSON.stringify({ userInfo, appInfo }, null, 2);
    navigator.clipboard.writeText(info);
    alert('User info copied to clipboard!');
  };

  if (!isOpen) {
    return (
      <button 
        className="dev-tools-toggle"
        onClick={() => setIsOpen(true)}
        title="Open Dev Tools"
      >
        🔧
      </button>
    );
  }

  return (
    <div className="dev-tools-panel">
      <div className="dev-tools-header">
        <h3>🔧 Dev Tools</h3>
        <button onClick={() => setIsOpen(false)} className="dev-tools-close">✕</button>
      </div>

      <div className="dev-tools-content">
        <div className="dev-tools-section">
          <h4>User Info</h4>
          {userInfo ? (
            <div className="dev-tools-info">
              <pre>{JSON.stringify(userInfo, null, 2)}</pre>
              <button onClick={copyUserInfo} className="dev-tools-btn">Copy User Info</button>
            </div>
          ) : (
            <p>Not logged in</p>
          )}
        </div>

        <div className="dev-tools-section">
          <h4>App Info</h4>
          <div className="dev-tools-info">
            <pre>{JSON.stringify(appInfo, null, 2)}</pre>
          </div>
        </div>

        <div className="dev-tools-section">
          <div className="dev-tools-section-header">
            <h4>Console Logs ({logs.length})</h4>
            <button onClick={clearLogs} className="dev-tools-btn-small">Clear</button>
          </div>
          <div className="dev-tools-logs">
            {logs.length === 0 ? (
              <p className="dev-tools-empty">No logs yet</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`dev-tools-log dev-tools-log-${log.type}`}>
                  <span className="dev-tools-log-time">{log.time}</span>
                  <span className="dev-tools-log-message">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dev-tools-section">
          <h4>Actions</h4>
          <div className="dev-tools-actions">
            <button onClick={clearLocalStorage} className="dev-tools-btn dev-tools-btn-danger">
              Clear LocalStorage
            </button>
            <button onClick={() => window.location.reload()} className="dev-tools-btn">
              Reload App
            </button>
            <button onClick={() => auth.signOut()} className="dev-tools-btn">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevTools;

