import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaTerminal, FaTimes, FaCopy, FaTrash, FaDownload } from 'react-icons/fa';
import './DeveloperConsole.scss';

interface ConsoleMessage {
    id: string;
    timestamp: Date;
    level: 'log' | 'warn' | 'error' | 'info';
    source: 'ipc' | 'renderer' | 'system';
    message: string;
    data?: any;
}

interface DeveloperConsoleProps {
    isOpen: boolean;
    onClose: () => void;
    consoleRef?: React.RefObject<HTMLDivElement | null>;
}

export const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({ isOpen, onClose, consoleRef: externalConsoleRef }) => {
    const [activeTab, setActiveTab] = useState<'combined' | 'ipc' | 'renderer'>('combined');
    const [messages, setMessages] = useState<ConsoleMessage[]>([]);
    const [isCapturing, setIsCapturing] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const consoleRef = useRef<HTMLDivElement | null>(null);
    const consoleModalRef = externalConsoleRef || useRef<HTMLDivElement | null>(null);
    const originalConsoleRef = useRef<{
        log: typeof console.log;
        warn: typeof console.warn;
        error: typeof console.error;
        info: typeof console.info;
    } | null>(null);

    // Add message to console
    const addMessage = useCallback((
        level: ConsoleMessage['level'],
        source: ConsoleMessage['source'],
        message: string,
        data?: any
    ) => {
        if (isPaused) return;

        const newMessage: ConsoleMessage = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            level,
            source,
            message,
            data
        };
        
        setMessages(prev => {
            const updated = [...prev, newMessage];
            // Limit to last 500 messages to prevent memory issues
            if (updated.length > 500) {
                return updated.slice(-500);
            }
            return updated;
        });
    }, [isPaused]);

    // Filter messages based on active tab
    const filteredMessages = messages.filter(msg => {
        if (activeTab === 'combined') return true;
        return msg.source === activeTab;
    });

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (consoleRef.current && !isPaused) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [messages, isPaused]);

    // Capture console logs
    useEffect(() => {
        if (!isCapturing || !isOpen) return;

        // Save original console methods only once
        if (!originalConsoleRef.current) {
            originalConsoleRef.current = {
                log: console.log.bind(console),
                warn: console.warn.bind(console),
                error: console.error.bind(console),
                info: console.info.bind(console)
            };
        }

        const original = originalConsoleRef.current;

        // Helper function to safely stringify arguments
        const safeStringify = (args: any[]): string => {
            return args.map(arg => {
                if (arg === null) return 'null';
                if (arg === undefined) return 'undefined';
                if (typeof arg === 'string') return arg;
                if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
                if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    try {
                        return String(arg);
                    } catch (e2) {
                        return '[Unstringifiable Object]';
                    }
                }
            }).join(' ');
        };

        // Override console methods
        console.log = (...args: any[]) => {
            original.log(...args);
            addMessage('log', 'renderer', safeStringify(args));
        };

        console.warn = (...args: any[]) => {
            original.warn(...args);
            addMessage('warn', 'renderer', safeStringify(args));
        };

        console.error = (...args: any[]) => {
            original.error(...args);
            addMessage('error', 'renderer', safeStringify(args));
        };

        console.info = (...args: any[]) => {
            original.info(...args);
            addMessage('info', 'renderer', safeStringify(args));
        };

        // Add initial system message
        addMessage('info', 'system', '🔍 Developer Console initialized - Capturing logs...');

        // Cleanup: restore original console methods
        return () => {
            if (original) {
                console.log = original.log;
                console.warn = original.warn;
                console.error = original.error;
                console.info = original.info;
            }
        };
    }, [isCapturing, isOpen, addMessage]);

    // Listen for window errors
    useEffect(() => {
        if (!isOpen) return;

        const handleError = (event: ErrorEvent) => {
            addMessage('error', 'renderer', `Uncaught Error: ${event.message}`, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            addMessage('error', 'renderer', `Unhandled Promise Rejection: ${event.reason}`, {
                reason: event.reason
            });
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        // Add system info on open
        addMessage('info', 'system', `✅ Developer Console ready`);
        addMessage('log', 'system', `Platform: ${navigator.platform}`);
        addMessage('log', 'system', `User Agent: ${navigator.userAgent.substring(0, 100)}...`);
        
        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, [isOpen, addMessage]);

    // Clear console
    const clearConsole = useCallback(() => {
        setMessages([]);
        addMessage('info', 'system', '🗑️ Console cleared');
    }, [addMessage]);

    // Copy message to clipboard
    const copyMessage = useCallback((message: ConsoleMessage) => {
        const text = `[${message.timestamp.toLocaleTimeString()}] ${message.level.toUpperCase()} (${message.source}): ${message.message}`;
        navigator.clipboard.writeText(text).then(() => {
            addMessage('info', 'system', '📋 Message copied to clipboard');
        }).catch(() => {
            addMessage('error', 'system', '❌ Failed to copy message');
        });
    }, [addMessage]);

    // Export console logs
    const exportLogs = useCallback(() => {
        const logText = messages.map(msg => 
            `[${msg.timestamp.toISOString()}] ${msg.level.toUpperCase()} (${msg.source}): ${msg.message}${msg.data ? '\n' + JSON.stringify(msg.data, null, 2) : ''}`
        ).join('\n\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `console-logs-${new Date().toISOString().replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addMessage('info', 'system', '💾 Logs exported successfully');
    }, [messages, addMessage]);

    // Prevent clicks inside console from propagating
    const handleConsoleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    if (!isOpen) return null;

    return (
        <div className="developer-console-overlay">
            <div ref={consoleModalRef} className="developer-console" onClick={handleConsoleClick}>
                <div className="console-header">
                    <h3><FaTerminal /> Developer Console</h3>
                    <div className="console-controls">
                        <label className="capture-toggle">
                            <input
                                type="checkbox"
                                checked={isCapturing}
                                onChange={(e) => setIsCapturing(e.target.checked)}
                            />
                            <span>Capture</span>
                        </label>
                        <label className="capture-toggle">
                            <input
                                type="checkbox"
                                checked={isPaused}
                                onChange={(e) => setIsPaused(e.target.checked)}
                            />
                            <span>Pause</span>
                        </label>
                        <button onClick={exportLogs} className="console-button" title="Export Logs">
                            <FaDownload />
                        </button>
                        <button onClick={clearConsole} className="console-button" title="Clear Console">
                            <FaTrash />
                        </button>
                        <button onClick={onClose} className="console-button" title="Close Console">
                            <FaTimes />
                        </button>
                    </div>
                </div>

                <div className="console-tabs">
                    <button
                        className={`console-tab ${activeTab === 'combined' ? 'active' : ''}`}
                        onClick={() => setActiveTab('combined')}
                    >
                        All ({messages.length})
                    </button>
                    <button
                        className={`console-tab ${activeTab === 'renderer' ? 'active' : ''}`}
                        onClick={() => setActiveTab('renderer')}
                    >
                        Renderer ({messages.filter(m => m.source === 'renderer').length})
                    </button>
                    <button
                        className={`console-tab ${activeTab === 'ipc' ? 'active' : ''}`}
                        onClick={() => setActiveTab('ipc')}
                    >
                        IPC ({messages.filter(m => m.source === 'ipc').length})
                    </button>
                </div>

                <div ref={consoleRef} className="console-output">
                    {filteredMessages.length === 0 ? (
                        <div className="console-empty">
                            <FaTerminal />
                            <p>No messages to display</p>
                            <p className="hint">Console logs will appear here...</p>
                        </div>
                    ) : (
                        filteredMessages.map((message) => (
                            <div key={message.id} className={`console-message ${message.level}`}>
                                <div className="message-header">
                                    <span className="timestamp">
                                        {message.timestamp.toLocaleTimeString()}
                                    </span>
                                    <span className={`level level-${message.level}`}>
                                        {message.level.toUpperCase()}
                                    </span>
                                    <span className={`source source-${message.source}`}>
                                        {message.source.toUpperCase()}
                                    </span>
                                    <button
                                        className="copy-button"
                                        onClick={() => copyMessage(message)}
                                        title="Copy message"
                                    >
                                        <FaCopy />
                                    </button>
                                </div>
                                <div className="message-content">
                                    {message.message}
                                </div>
                                {message.data && (
                                    <div className="message-data">
                                        <pre>{JSON.stringify(message.data, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="console-footer">
                    <div className="console-info">
                        <span>{filteredMessages.length} messages</span>
                        {isPaused && <span className="paused-indicator">⏸ Paused</span>}
                        {!isCapturing && <span className="capture-indicator">⏹ Not Capturing</span>}
                    </div>
                    <div className="console-hint">
                        Use controls above to manage console • Click copy icon to copy message
                    </div>
                </div>
            </div>
        </div>
    );
};
