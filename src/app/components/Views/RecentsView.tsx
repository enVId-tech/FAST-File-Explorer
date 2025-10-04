import React, { useState, useEffect } from 'react';
import { FaFileExcel, FaFilePowerpoint, FaFileWord, FaFileImage, FaFileCode, FaFile, FaFilePdf, FaFolder, FaClock, FaStar, FaCalendarAlt, FaFilter, FaSortAmountDown, FaSortAmountUp, FaTrash, FaFileDownload, FaSearch, FaTimes } from 'react-icons/fa';
import { recentFilesManager, RecentFileEntry, SortField, SortDirection } from '../../utils/RecentFilesManager';
import { formatFileSize } from '../../../shared/fileSizeUtils';

interface RecentsViewProps {
    viewMode: string;
}

export const RecentsView: React.FC<RecentsViewProps> = ({ viewMode }) => {
    const [recentFiles, setRecentFiles] = useState<RecentFileEntry[]>([]);
    const [filteredFiles, setFilteredFiles] = useState<RecentFileEntry[]>([]);
    const [filterType, setFilterType] = useState<string>('all');
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [stats, setStats] = useState<any>(null);

    // Load recent files on mount and subscribe to changes
    useEffect(() => {
        loadRecentFiles();
        updateStats();

        const unsubscribe = recentFilesManager.onChange(() => {
            loadRecentFiles();
            updateStats();
        });

        return unsubscribe;
    }, []);

    // Apply filters, search, and sorting when dependencies change
    useEffect(() => {
        applyFiltersAndSort();
    }, [recentFiles, filterType, sortField, sortDirection, searchQuery]);

    const loadRecentFiles = () => {
        const files = recentFilesManager.getRecentFiles();
        setRecentFiles(files);
    };

    const updateStats = () => {
        const statistics = recentFilesManager.getStats();
        setStats(statistics);
    };

    const applyFiltersAndSort = () => {
        let result = [...recentFiles];

        // Apply type filter
        if (filterType !== 'all') {
            result = recentFilesManager.getByType(filterType);
        }

        // Apply search
        if (searchQuery.trim()) {
            result = result.filter(entry =>
                entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.path.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply sorting
        result = recentFilesManager.sortBy(sortField, sortDirection);

        // If we had filters, re-apply them to sorted results
        if (filterType !== 'all' || searchQuery.trim()) {
            if (filterType !== 'all') {
                result = result.filter(entry => {
                    const typeFiltered = recentFilesManager.getByType(filterType);
                    return typeFiltered.some(f => f.id === entry.id);
                });
            }
            if (searchQuery.trim()) {
                result = result.filter(entry =>
                    entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    entry.path.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }
        }

        setFilteredFiles(result);
    };

    const handleClearHistory = () => {
        recentFilesManager.clearHistory();
    };

    const handleRemoveItem = (id: string) => {
        recentFilesManager.removeEntry(id);
    };

    const handleExport = () => {
        const json = recentFilesManager.export();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recent-files-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const json = e.target?.result as string;
                    if (recentFilesManager.import(json)) {
                        alert('Recent files imported successfully!');
                    } else {
                        alert('Failed to import recent files. Invalid format.');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const getFileIcon = (entry: RecentFileEntry): React.ReactNode => {
        const ext = entry.extension.toLowerCase();
        const category = recentFilesManager.getFileTypeCategory(entry);

        if (entry.type === 'directory') return <FaFolder style={{ color: '#FDB900' }} />;

        switch (category) {
            case 'document':
                if (['.xls', '.xlsx'].includes(ext)) return <FaFileExcel style={{ color: '#207245' }} />;
                if (['.ppt', '.pptx'].includes(ext)) return <FaFilePowerpoint style={{ color: '#D24726' }} />;
                if (['.doc', '.docx'].includes(ext)) return <FaFileWord style={{ color: '#2B579A' }} />;
                if (ext === '.pdf') return <FaFilePdf style={{ color: '#DC3545' }} />;
                return <FaFile style={{ color: '#6C757D' }} />;
            case 'image':
                return <FaFileImage style={{ color: '#0078D4' }} />;
            case 'code':
                return <FaFileCode style={{ color: '#0078D4' }} />;
            default:
                return <FaFile style={{ color: '#6C757D' }} />;
        }
    };

    const formatDate = (timestamp: number): string => {
        const date = new Date(timestamp);
        const now = Date.now();
        const diff = now - timestamp;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    };

    const getEmptyState = () => (
        <div className="empty-state">
            <FaClock className="empty-icon" />
            <h3>No Recent Files</h3>
            <p>Files you open will appear here</p>
        </div>
    );

    const renderFilterBar = () => (
        <div className={`filter-bar ${showFilters ? 'expanded' : ''}`}>
            <div className="filter-controls">
                <div className="search-box">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search recent files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="clear-search" onClick={() => setSearchQuery('')}>
                            <FaTimes />
                        </button>
                    )}
                </div>

                <button 
                    className={`filter-toggle ${showFilters ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <FaFilter /> Filters
                </button>

                <div className="sort-controls">
                    <label>Sort:</label>
                    <select value={sortField} onChange={(e) => setSortField(e.target.value as SortField)}>
                        <option value="date">Date</option>
                        <option value="name">Name</option>
                        <option value="type">Type</option>
                        <option value="count">Access Count</option>
                        <option value="size">Size</option>
                    </select>
                    <button onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}>
                        {sortDirection === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />}
                    </button>
                </div>

                <button className="action-btn danger" onClick={handleClearHistory}>
                    <FaTrash /> Clear All
                </button>

                <button className="action-btn" onClick={handleExport}>
                    <FaFileDownload /> Export
                </button>
            </div>

            {showFilters && (
                <div className="filter-options">
                    <button 
                        className={`filter-chip ${filterType === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterType('all')}
                    >
                        All ({stats?.totalEntries || 0})
                    </button>
                    <button 
                        className={`filter-chip ${filterType === 'folders' ? 'active' : ''}`}
                        onClick={() => setFilterType('folders')}
                    >
                        <FaFolder /> Folders ({stats?.typeBreakdown?.folder || 0})
                    </button>
                    <button 
                        className={`filter-chip ${filterType === 'documents' ? 'active' : ''}`}
                        onClick={() => setFilterType('documents')}
                    >
                        <FaFile /> Documents ({stats?.typeBreakdown?.document || 0})
                    </button>
                    <button 
                        className={`filter-chip ${filterType === 'images' ? 'active' : ''}`}
                        onClick={() => setFilterType('images')}
                    >
                        <FaFileImage /> Images ({stats?.typeBreakdown?.image || 0})
                    </button>
                    <button 
                        className={`filter-chip ${filterType === 'code' ? 'active' : ''}`}
                        onClick={() => setFilterType('code')}
                    >
                        <FaFileCode /> Code ({stats?.typeBreakdown?.code || 0})
                    </button>
                    <button 
                        className={`filter-chip ${filterType === 'videos' ? 'active' : ''}`}
                        onClick={() => setFilterType('videos')}
                    >
                        Videos ({stats?.typeBreakdown?.video || 0})
                    </button>
                    <button 
                        className={`filter-chip ${filterType === 'audio' ? 'active' : ''}`}
                        onClick={() => setFilterType('audio')}
                    >
                        Audio ({stats?.typeBreakdown?.audio || 0})
                    </button>
                    <button 
                        className={`filter-chip ${filterType === 'archives' ? 'active' : ''}`}
                        onClick={() => setFilterType('archives')}
                    >
                        Archives ({stats?.typeBreakdown?.archive || 0})
                    </button>
                </div>
            )}
        </div>
    );

    if (viewMode === 'grid') {
        return (
            <div className="recents-view">
                <div className="recents-header">
                    <div className="header-content">
                        <FaClock className="header-icon" />
                        <div className="header-text">
                            <h2>Recent Files</h2>
                            <p>{stats?.totalEntries || 0} items • {stats?.totalAccesses || 0} total accesses</p>
                        </div>
                    </div>
                </div>

                {renderFilterBar()}

                <div className="recents-content">
                    {filteredFiles.length === 0 ? getEmptyState() : (
                        <div className="recents-grid">
                            {filteredFiles.map((file) => (
                                <div key={file.id} className="recent-item-card">
                                    <div className="item-header">
                                        <div className="item-icon">
                                            {getFileIcon(file)}
                                        </div>
                                        <button
                                            className="remove-btn"
                                            onClick={() => handleRemoveItem(file.id)}
                                            title="Remove from recent files"
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>

                                    <div className="item-content">
                                        <h3 className="item-name" title={file.name}>
                                            {file.name}
                                        </h3>
                                        <div className="item-details">
                                            <div className="detail-row">
                                                <FaClock className="detail-icon" />
                                                <span>{formatDate(file.lastAccessed)}</span>
                                            </div>
                                            {file.size && (
                                                <div className="detail-row">
                                                    <span className="file-size">{formatFileSize(file.size)}</span>
                                                </div>
                                            )}
                                            <div className="detail-row">
                                                <span className="access-count">Opened {file.accessCount}x</span>
                                            </div>
                                        </div>
                                        <div className="item-path" title={file.path}>
                                            {file.path}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // List view
    return (
        <div className="recents-view">
            <div className="recents-header">
                <div className="header-content">
                    <FaClock className="header-icon" />
                    <div className="header-text">
                        <h2>Recent Files</h2>
                        <p>{stats?.totalEntries || 0} items • {stats?.totalAccesses || 0} total accesses</p>
                    </div>
                </div>
            </div>

            {renderFilterBar()}

            <div className="recents-content">
                {filteredFiles.length === 0 ? getEmptyState() : (
                    <div className="recents-list">
                        <div className="list-header">
                            <div className="column-header name" onClick={() => toggleSort('name')}>
                                Name {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                            </div>
                            <div className="column-header last-opened" onClick={() => toggleSort('date')}>
                                Last Opened {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
                            </div>
                            <div className="column-header size" onClick={() => toggleSort('size')}>
                                Size {sortField === 'size' && (sortDirection === 'asc' ? '▲' : '▼')}
                            </div>
                            <div className="column-header type" onClick={() => toggleSort('type')}>
                                Type {sortField === 'type' && (sortDirection === 'asc' ? '▲' : '▼')}
                            </div>
                            <div className="column-header count" onClick={() => toggleSort('count')}>
                                Count {sortField === 'count' && (sortDirection === 'asc' ? '▲' : '▼')}
                            </div>
                            <div className="column-header path">Location</div>
                            <div className="column-header actions">Actions</div>
                        </div>

                        {filteredFiles.map((file) => (
                            <div key={file.id} className="recent-item-row">
                                <div className="item-name-column">
                                    <div className="item-icon">
                                        {getFileIcon(file)}
                                    </div>
                                    <span className="item-name">{file.name}</span>
                                </div>
                                <div className="item-last-opened">
                                    <FaClock className="time-icon" />
                                    {formatDate(file.lastAccessed)}
                                </div>
                                <div className="item-size">{file.size ? formatFileSize(file.size) : '—'}</div>
                                <div className="item-type">{recentFilesManager.getFileTypeCategory(file)}</div>
                                <div className="item-count">{file.accessCount}x</div>
                                <div className="item-path" title={file.path}>{file.parentPath}</div>
                                <div className="item-actions">
                                    <button
                                        className="remove-btn"
                                        onClick={() => handleRemoveItem(file.id)}
                                        title="Remove from recent files"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

