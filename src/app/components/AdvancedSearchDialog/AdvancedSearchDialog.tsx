import React, { useState, useEffect } from 'react';
import { FileSystemItem } from '../../../shared/ipc-channels';
import { advancedSearchManager, SearchQuery, SearchResult, SearchHistory } from '../../utils/AdvancedSearchManager';
import './AdvancedSearchDialog.scss';

interface AdvancedSearchDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (path: string) => void;
    currentPath: string;
    items: FileSystemItem[];
}

export const AdvancedSearchDialog: React.FC<AdvancedSearchDialogProps> = ({
    isOpen,
    onClose,
    onNavigate,
    currentPath,
    items
}) => {
    const [queryName, setQueryName] = useState('');
    const [searchName, setSearchName] = useState('');
    const [searchContent, setSearchContent] = useState('');
    const [useRegex, setUseRegex] = useState(false);
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [sizeMin, setSizeMin] = useState('');
    const [sizeMax, setSizeMax] = useState('');
    const [scope, setScope] = useState<'current' | 'global'>('current');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState<'search' | 'history' | 'saved'>('search');
    const [savedQueries, setSavedQueries] = useState<SearchQuery[]>([]);
    const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);

    useEffect(() => {
        if (isOpen) {
            setSavedQueries(advancedSearchManager.getSavedQueries());
            setSearchHistory(advancedSearchManager.getSearchHistory(20));
        }
    }, [isOpen]);

    const handleSearch = async () => {
        if (!searchName && !searchContent) {
            return;
        }

        setIsSearching(true);
        try {
            const query = advancedSearchManager.createQuickQuery(
                searchName || searchContent,
                scope,
                scope === 'current' ? currentPath : undefined
            );

            // Add custom criteria
            query.criteria = {
                name: searchName || undefined,
                content: searchContent || undefined,
                useRegex,
                caseSensitive,
                fileTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
                sizeRange: sizeMin || sizeMax ? {
                    min: sizeMin ? parseInt(sizeMin) * 1024 : 0,
                    max: sizeMax ? parseInt(sizeMax) * 1024 : Number.MAX_SAFE_INTEGER
                } : undefined
            };

            const searchResults = await advancedSearchManager.executeSearch(query, items);
            setResults(searchResults);
            
            // Refresh history
            setSearchHistory(advancedSearchManager.getSearchHistory(20));
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSaveQuery = () => {
        if (!queryName) {
            alert('Please enter a name for this query');
            return;
        }

        const query = {
            name: queryName,
            criteria: {
                name: searchName || undefined,
                content: searchContent || undefined,
                useRegex,
                caseSensitive,
                fileTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
                sizeRange: sizeMin || sizeMax ? {
                    min: sizeMin ? parseInt(sizeMin) * 1024 : 0,
                    max: sizeMax ? parseInt(sizeMax) * 1024 : Number.MAX_SAFE_INTEGER
                } : undefined
            },
            scope,
            scopePath: scope === 'current' ? currentPath : undefined
        };

        advancedSearchManager.saveQuery(query);
        setSavedQueries(advancedSearchManager.getSavedQueries());
        setQueryName('');
        alert('Query saved successfully!');
    };

    const handleLoadQuery = (query: SearchQuery) => {
        setSearchName(query.criteria.name || '');
        setSearchContent(query.criteria.content || '');
        setUseRegex(query.criteria.useRegex || false);
        setCaseSensitive(query.criteria.caseSensitive || false);
        setSelectedTypes(query.criteria.fileTypes || []);
        setScope(query.scope);
        
        if (query.criteria.sizeRange) {
            setSizeMin(Math.floor(query.criteria.sizeRange.min / 1024).toString());
            setSizeMax(Math.floor(query.criteria.sizeRange.max / 1024).toString());
        }
        
        setActiveTab('search');
    };

    const handleDeleteQuery = (id: string) => {
        if (confirm('Delete this saved query?')) {
            advancedSearchManager.deleteQuery(id);
            setSavedQueries(advancedSearchManager.getSavedQueries());
        }
    };

    const handleExport = () => {
        const csv = advancedSearchManager.exportToCSV(results);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `search-results-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const fileTypeCategories = advancedSearchManager.getFileTypeCategories();

    if (!isOpen) return null;

    return (
        <div className="advanced-search-overlay">
            <div className="advanced-search-dialog">
                <div className="advanced-search-header">
                    <h2>🔍 Advanced Search</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="advanced-search-tabs">
                    <button
                        className={`tab ${activeTab === 'search' ? 'active' : ''}`}
                        onClick={() => setActiveTab('search')}
                    >
                        Search
                    </button>
                    <button
                        className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        History ({searchHistory.length})
                    </button>
                    <button
                        className={`tab ${activeTab === 'saved' ? 'active' : ''}`}
                        onClick={() => setActiveTab('saved')}
                    >
                        Saved ({savedQueries.length})
                    </button>
                </div>

                <div className="advanced-search-content">
                    {activeTab === 'search' && (
                        <div className="search-tab">
                            {/* Search Criteria */}
                            <div className="criteria-section">
                                <div className="form-group">
                                    <label>File Name:</label>
                                    <input
                                        type="text"
                                        value={searchName}
                                        onChange={(e) => setSearchName(e.target.value)}
                                        placeholder="Enter filename or pattern"
                                        disabled={isSearching}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>File Content:</label>
                                    <input
                                        type="text"
                                        value={searchContent}
                                        onChange={(e) => setSearchContent(e.target.value)}
                                        placeholder="Search inside files (text files only)"
                                        disabled={isSearching}
                                    />
                                </div>

                                <div className="form-row">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={useRegex}
                                            onChange={(e) => setUseRegex(e.target.checked)}
                                            disabled={isSearching}
                                        />
                                        Use Regular Expression
                                    </label>
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={caseSensitive}
                                            onChange={(e) => setCaseSensitive(e.target.checked)}
                                            disabled={isSearching}
                                        />
                                        Case Sensitive
                                    </label>
                                </div>

                                <div className="form-group">
                                    <label>File Types:</label>
                                    <div className="file-type-selector">
                                        {Object.entries(fileTypeCategories).map(([category, extensions]) => (
                                            <button
                                                key={category}
                                                className={`type-button ${selectedTypes.some(t => extensions.includes(t)) ? 'active' : ''}`}
                                                onClick={() => {
                                                    const hasAll = extensions.every(ext => selectedTypes.includes(ext));
                                                    if (hasAll) {
                                                        setSelectedTypes(selectedTypes.filter(t => !extensions.includes(t)));
                                                    } else {
                                                        setSelectedTypes([...new Set([...selectedTypes, ...extensions])]);
                                                    }
                                                }}
                                                disabled={isSearching}
                                            >
                                                {category}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Size Min (KB):</label>
                                        <input
                                            type="number"
                                            value={sizeMin}
                                            onChange={(e) => setSizeMin(e.target.value)}
                                            placeholder="0"
                                            disabled={isSearching}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Size Max (KB):</label>
                                        <input
                                            type="number"
                                            value={sizeMax}
                                            onChange={(e) => setSizeMax(e.target.value)}
                                            placeholder="∞"
                                            disabled={isSearching}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Search Scope:</label>
                                    <div className="scope-selector">
                                        <label className="radio-label">
                                            <input
                                                type="radio"
                                                checked={scope === 'current'}
                                                onChange={() => setScope('current')}
                                                disabled={isSearching}
                                            />
                                            Current Folder
                                        </label>
                                        <label className="radio-label">
                                            <input
                                                type="radio"
                                                checked={scope === 'global'}
                                                onChange={() => setScope('global')}
                                                disabled={isSearching}
                                            />
                                            Entire Drive
                                        </label>
                                    </div>
                                </div>

                                <div className="action-buttons">
                                    <button
                                        className="search-button"
                                        onClick={handleSearch}
                                        disabled={isSearching || (!searchName && !searchContent)}
                                    >
                                        {isSearching ? 'Searching...' : '🔍 Search'}
                                    </button>
                                    <div className="form-group inline">
                                        <input
                                            type="text"
                                            value={queryName}
                                            onChange={(e) => setQueryName(e.target.value)}
                                            placeholder="Query name"
                                            disabled={isSearching}
                                        />
                                        <button
                                            className="save-button"
                                            onClick={handleSaveQuery}
                                            disabled={isSearching || !queryName}
                                        >
                                            💾 Save Query
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Results */}
                            {results.length > 0 && (
                                <div className="results-section">
                                    <div className="results-header">
                                        <h3>Results ({results.length})</h3>
                                        <button className="export-button" onClick={handleExport}>
                                            📥 Export CSV
                                        </button>
                                    </div>
                                    <div className="results-list">
                                        {results.map((result, idx) => (
                                            <div
                                                key={idx}
                                                className="result-item"
                                                onClick={() => {
                                                    onNavigate(result.item.path);
                                                    onClose();
                                                }}
                                            >
                                                <div className="result-icon">
                                                    {result.item.type === 'directory' ? '📁' : '📄'}
                                                </div>
                                                <div className="result-info">
                                                    <div className="result-name">{result.item.name}</div>
                                                    <div className="result-path">{result.item.path}</div>
                                                    <div className="result-matches">
                                                        Matches: {result.matches.map(m => m.type).join(', ')}
                                                        {' • Score: '}{result.score}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {results.length === 0 && !isSearching && searchName && (
                                <div className="no-results">
                                    No results found. Try different search criteria.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="history-tab">
                            <div className="history-header">
                                <h3>Recent Searches</h3>
                                <button
                                    className="clear-button"
                                    onClick={() => {
                                        advancedSearchManager.clearHistory();
                                        setSearchHistory([]);
                                    }}
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="history-list">
                                {searchHistory.map((entry, idx) => (
                                    <div
                                        key={idx}
                                        className="history-item"
                                        onClick={() => handleLoadQuery(entry.query)}
                                    >
                                        <div className="history-name">{entry.query.name}</div>
                                        <div className="history-details">
                                            {entry.results} results • {new Date(entry.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                                {searchHistory.length === 0 && (
                                    <div className="empty-state">No search history yet</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'saved' && (
                        <div className="saved-tab">
                            <div className="saved-header">
                                <h3>Saved Queries</h3>
                            </div>
                            <div className="saved-list">
                                {savedQueries.map((query) => (
                                    <div key={query.id} className="saved-item">
                                        <div
                                            className="saved-info"
                                            onClick={() => handleLoadQuery(query)}
                                        >
                                            <div className="saved-name">{query.name}</div>
                                            <div className="saved-details">
                                                {query.criteria.name && `Name: "${query.criteria.name}" • `}
                                                {query.scope === 'current' ? 'Current Folder' : 'Global'}
                                            </div>
                                        </div>
                                        <button
                                            className="delete-button"
                                            onClick={() => handleDeleteQuery(query.id)}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                                {savedQueries.length === 0 && (
                                    <div className="empty-state">No saved queries yet</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="advanced-search-footer">
                    <button className="close-footer-button" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
