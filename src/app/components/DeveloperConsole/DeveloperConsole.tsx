import React, { useState, useRef, useEffect } from 'react';
import { FaTerminal, FaTimes, FaCopy, FaTrash } from 'react-icons/fa';
import './DeveloperConsole.scss';

interface ConsoleMessage {
    id: string;
    timestamp: Date;
    level: 'log' | 'warn' | 'error' | 'info';
    source: 'ipc' | 'renderer' | 'combined';
    message: string;
    data?: any;
}

interface DeveloperConsoleProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'ipc' | 'renderer' | 'combined'>('combined');
    const [messages, setMessages] = useState<ConsoleMessage[]>([]);
    const [isCapturing, setIsCapturing] = useState(true);
    const consoleRef = useRef<HTMLDivElement>(null);
    const consoleModalRef = useRef<HTMLDivElement>(null);

    // Add message to console
    const addMessage = (level: ConsoleMessage['level'], source: ConsoleMessage['source'], message: string, data?: any) => {
        const newMessage: ConsoleMessage = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
            level,
            source,
            message,
            data
        };
        
        setMessages(prev => [...prev, newMessage]);
    };

    // Filter messages based on active tab
    const filteredMessages = messages.filter(msg => {
        if (activeTab === 'combined') return true;
        return msg.source === activeTab;
    });

    // Handle click outside to close console
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (consoleModalRef.current && !consoleModalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            // Add a small delay to prevent immediate closure on opening
            const timeout = setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 100);
            
            return () => {
                clearTimeout(timeout);
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [messages]);

    // Capture console logs if enabled
    useEffect(() => {
        if (!isCapturing) return;

        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        const originalInfo = console.info;

        console.log = (...args) => {
            originalLog.apply(console, args);
            addMessage('log', 'renderer', args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '));
        };

        console.warn = (...args) => {
            originalWarn.apply(console, args);
            addMessage('warn', 'renderer', args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '));
        };

        console.error = (...args) => {
            originalError.apply(console, args);
            addMessage('error', 'renderer', args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '));
        };

        console.info = (...args) => {
            originalInfo.apply(console, args);
            addMessage('info', 'renderer', args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '));
        };

        return () => {
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
            console.info = originalInfo;
        };
    }, [isCapturing]);

    // Clear console
    const clearConsole = () => {
        setMessages([]);
    };

    // Copy message to clipboard
    const copyMessage = (message: ConsoleMessage) => {
        const text = `[${message.timestamp.toLocaleTimeString()}] ${message.level.toUpperCase()}: ${message.message}`;
        navigator.clipboard.writeText(text);
    };

    if (!isOpen) return null;

    return (
        <div className="developer-console-overlay">
            <div ref={consoleModalRef} className="developer-console">
                <div className="console-header">
                    <h3><FaTerminal /> Developer Console</h3>
                    <div className="console-controls">
                        <label className="capture-toggle">
                            <input
                                type="checkbox"
                                checked={isCapturing}
                                onChange={(e) => setIsCapturing(e.target.checked)}
                            />
                            Capture Logs
                        </label>
                        <button onClick={clearConsole} className="console-button">
                            <FaTrash />
                        </button>
                        <button onClick={onClose} className="console-button">
                            <FaTimes />
                        </button>
                    </div>
                </div>

                <div className="console-tabs">
                    <button
                        className={`console-tab ${activeTab === 'combined' ? 'active' : ''}`}
                        onClick={() => setActiveTab('combined')}
                    >
                        Combined
                    </button>
                    <button
                        className={`console-tab ${activeTab === 'ipc' ? 'active' : ''}`}
                        onClick={() => setActiveTab('ipc')}
                    >
                        IPC Process
                    </button>
                    <button
                        className={`console-tab ${activeTab === 'renderer' ? 'active' : ''}`}
                        onClick={() => setActiveTab('renderer')}
                    >
                        Renderer Process
                    </button>
                </div>

                <div ref={consoleRef} className="console-output">
                    {filteredMessages.map((message) => (
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
                    ))}
                </div>

                <div className="console-info">
                    <p className="info-text">
                        <strong>Read-only console:</strong> View application logs and messages from IPC and renderer processes. 
                        Command execution has been disabled for security reasons.
                    </p>
                </div>
            </div>
        </div>
    );
};
