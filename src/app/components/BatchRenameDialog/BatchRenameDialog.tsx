import React, { useState, useEffect, useMemo } from 'react';
import { FileSystemItem } from '../../../shared/ipc-channels';
import { batchRenameManager, RenamePattern, RenamePreview, RenameOptions } from '../../utils/BatchRenameManager';
import './BatchRenameDialog.scss';

interface BatchRenameDialogProps {
    items: FileSystemItem[];
    onClose: () => void;
    onRename: () => void;
}

export const BatchRenameDialog: React.FC<BatchRenameDialogProps> = ({
    items,
    onClose,
    onRename
}) => {
    const [pattern, setPattern] = useState<RenamePattern>('find-replace');
    const [options, setOptions] = useState<RenameOptions>({});
    const [previews, setPreviews] = useState<RenamePreview[]>([]);
    const [validation, setValidation] = useState<{
        valid: boolean;
        errors: string[];
        conflicts: Map<string, string[]>;
    }>({ valid: true, errors: [], conflicts: new Map() });
    const [isProcessing, setIsProcessing] = useState(false);

    // Generate preview when pattern or options change
    useEffect(() => {
        if (items.length === 0) return;
        
        try {
            const newPreviews = batchRenameManager.createPreview(items, pattern, options);
            setPreviews(newPreviews);
            
            const validationResult = batchRenameManager.validatePreviews(newPreviews);
            setValidation(validationResult);
        } catch (error) {
            console.error('Preview generation error:', error);
            setPreviews([]);
            setValidation({
                valid: false,
                errors: ['Failed to generate preview'],
                conflicts: new Map()
            });
        }
    }, [items, pattern, options]);

    // Get suggestions for current pattern
    const suggestions = useMemo(() => {
        return batchRenameManager.getSuggestions(items);
    }, [items]);

    const handleApply = async () => {
        if (!validation.valid || previews.length === 0) return;

        setIsProcessing(true);
        try {
            const result = await batchRenameManager.executeRename(previews);
            
            if (result.success) {
                onRename();
                onClose();
            } else {
                alert(`Rename completed with ${result.errors.length} errors:\n${result.errors.slice(0, 5).join('\n')}`);
            }
        } catch (error) {
            alert(`Rename failed: ${error}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUndo = async () => {
        setIsProcessing(true);
        try {
            const result = await batchRenameManager.undoLastRename();
            
            if (result.success) {
                onRename();
                alert(`Successfully undone ${result.undone} renames`);
            } else {
                alert(`Undo failed with ${result.errors.length} errors`);
            }
        } catch (error) {
            alert(`Undo failed: ${error}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const canUndo = batchRenameManager.canUndo();

    return (
        <div className="batch-rename-overlay">
            <div className="batch-rename-dialog">
                <div className="batch-rename-header">
                    <h2>Batch Rename</h2>
                    <span className="item-count">{items.length} items selected</span>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="batch-rename-content">
                    {/* Pattern Selection */}
                    <div className="pattern-section">
                        <label htmlFor="pattern-select">Rename Pattern:</label>
                        <select
                            id="pattern-select"
                            value={pattern}
                            onChange={(e) => {
                                setPattern(e.target.value as RenamePattern);
                                setOptions({});
                            }}
                            disabled={isProcessing}
                        >
                            <option value="find-replace">Find and Replace</option>
                            <option value="numbering">Add Numbering</option>
                            <option value="case-conversion">Change Case</option>
                            <option value="prefix-suffix">Add Prefix/Suffix</option>
                            <option value="date-time">Insert Date/Time</option>
                            <option value="remove-text">Remove Text</option>
                            <option value="custom-pattern">Custom Pattern</option>
                        </select>
                    </div>

                    {/* Options Form */}
                    <div className="options-section">
                        {renderOptionsForm(pattern, options, setOptions, isProcessing)}
                    </div>

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                        <div className="suggestions-section">
                            <h4>Suggestions:</h4>
                            <div className="suggestions-list">
                                {suggestions.map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        className="suggestion-button"
                                        onClick={() => {
                                            setPattern(suggestion.pattern);
                                            setOptions(suggestion.options);
                                        }}
                                        disabled={isProcessing}
                                    >
                                        {suggestion.description}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Validation Errors */}
                    {!validation.valid && (
                        <div className="validation-errors">
                            <h4>⚠️ Validation Errors:</h4>
                            <ul>
                                {validation.errors.map((error, idx) => (
                                    <li key={idx}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Preview Table */}
                    <div className="preview-section">
                        <h3>Preview:</h3>
                        <div className="preview-table-container">
                            <table className="preview-table">
                                <thead>
                                    <tr>
                                        <th>Original Name</th>
                                        <th>→</th>
                                        <th>New Name</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previews.map((preview, idx) => {
                                        const hasConflict = validation.conflicts.has(preview.newName);
                                        const hasError = preview.error !== undefined;
                                        
                                        return (
                                            <tr
                                                key={idx}
                                                className={`
                                                    ${hasError ? 'error' : ''}
                                                    ${hasConflict ? 'conflict' : ''}
                                                    ${!hasError && !hasConflict ? 'valid' : ''}
                                                `}
                                            >
                                                <td className="original-name">{preview.item.name}</td>
                                                <td className="arrow">→</td>
                                                <td className="new-name">{preview.newName}</td>
                                                <td className="status">
                                                    {hasError && <span className="error-badge">❌ {preview.error}</span>}
                                                    {hasConflict && <span className="conflict-badge">⚠️ Conflict</span>}
                                                    {!hasError && !hasConflict && <span className="success-badge">✓</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="batch-rename-footer">
                    <div className="left-actions">
                        {canUndo && (
                            <button
                                className="undo-button"
                                onClick={handleUndo}
                                disabled={isProcessing}
                            >
                                ↶ Undo Last Rename
                            </button>
                        )}
                    </div>
                    <div className="right-actions">
                        <button
                            className="cancel-button"
                            onClick={onClose}
                            disabled={isProcessing}
                        >
                            Cancel
                        </button>
                        <button
                            className="apply-button"
                            onClick={handleApply}
                            disabled={!validation.valid || isProcessing || previews.length === 0}
                        >
                            {isProcessing ? 'Renaming...' : `Rename ${previews.length} Items`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper function to render options form based on pattern
function renderOptionsForm(
    pattern: RenamePattern,
    options: RenameOptions,
    setOptions: React.Dispatch<React.SetStateAction<RenameOptions>>,
    disabled: boolean
): React.ReactElement {
    switch (pattern) {
        case 'find-replace':
            return (
                <div className="options-form">
                    <div className="form-group">
                        <label htmlFor="find-text">Find:</label>
                        <input
                            id="find-text"
                            type="text"
                            value={options.findText || ''}
                            onChange={(e) => setOptions({ ...options, findText: e.target.value })}
                            placeholder="Text to find"
                            disabled={disabled}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="replace-text">Replace with:</label>
                        <input
                            id="replace-text"
                            type="text"
                            value={options.replaceText || ''}
                            onChange={(e) => setOptions({ ...options, replaceText: e.target.value })}
                            placeholder="Replacement text"
                            disabled={disabled}
                        />
                    </div>
                    <div className="form-group checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={options.useRegex || false}
                                onChange={(e) => setOptions({ ...options, useRegex: e.target.checked })}
                                disabled={disabled}
                            />
                            Use Regular Expression
                        </label>
                    </div>
                    <div className="form-group checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={options.matchCase || false}
                                onChange={(e) => setOptions({ ...options, matchCase: e.target.checked })}
                                disabled={disabled}
                            />
                            Match Case
                        </label>
                    </div>
                </div>
            );

        case 'numbering':
            return (
                <div className="options-form">
                    <div className="form-group">
                        <label htmlFor="start-number">Start Number:</label>
                        <input
                            id="start-number"
                            type="number"
                            value={options.startNumber || 1}
                            onChange={(e) => setOptions({ ...options, startNumber: parseInt(e.target.value) || 1 })}
                            disabled={disabled}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="padding">Padding (digits):</label>
                        <input
                            id="padding"
                            type="number"
                            min="1"
                            max="10"
                            value={options.padding || 3}
                            onChange={(e) => setOptions({ ...options, padding: parseInt(e.target.value) || 3 })}
                            disabled={disabled}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="number-position">Position:</label>
                        <select
                            id="number-position"
                            value={options.position || 'prefix'}
                            onChange={(e) => setOptions({ ...options, position: e.target.value as 'prefix' | 'suffix' })}
                            disabled={disabled}
                        >
                            <option value="prefix">Before name</option>
                            <option value="suffix">After name</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="separator">Separator:</label>
                        <input
                            id="separator"
                            type="text"
                            value={options.separator || '_'}
                            onChange={(e) => setOptions({ ...options, separator: e.target.value })}
                            placeholder="_"
                            maxLength={5}
                            disabled={disabled}
                        />
                    </div>
                </div>
            );

        case 'case-conversion':
            return (
                <div className="options-form">
                    <div className="form-group">
                        <label htmlFor="case-type">Case Type:</label>
                        <select
                            id="case-type"
                            value={options.caseType || 'lower'}
                            onChange={(e) => setOptions({ ...options, caseType: e.target.value as any })}
                            disabled={disabled}
                        >
                            <option value="lower">lowercase</option>
                            <option value="upper">UPPERCASE</option>
                            <option value="title">Title Case</option>
                            <option value="camel">camelCase</option>
                            <option value="pascal">PascalCase</option>
                        </select>
                    </div>
                </div>
            );

        case 'prefix-suffix':
            return (
                <div className="options-form">
                    <div className="form-group">
                        <label htmlFor="prefix">Prefix:</label>
                        <input
                            id="prefix"
                            type="text"
                            value={options.prefix || ''}
                            onChange={(e) => setOptions({ ...options, prefix: e.target.value })}
                            placeholder="Text to add before"
                            disabled={disabled}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="suffix">Suffix:</label>
                        <input
                            id="suffix"
                            type="text"
                            value={options.suffix || ''}
                            onChange={(e) => setOptions({ ...options, suffix: e.target.value })}
                            placeholder="Text to add after"
                            disabled={disabled}
                        />
                    </div>
                </div>
            );

        case 'date-time':
            return (
                <div className="options-form">
                    <div className="form-group">
                        <label htmlFor="date-format">Date Format:</label>
                        <select
                            id="date-format"
                            value={options.dateFormat || 'YYYY-MM-DD'}
                            onChange={(e) => setOptions({ ...options, dateFormat: e.target.value })}
                            disabled={disabled}
                        >
                            <option value="YYYY-MM-DD">2024-01-15</option>
                            <option value="YYYY_MM_DD">2024_01_15</option>
                            <option value="DD-MM-YYYY">15-01-2024</option>
                            <option value="MM-DD-YYYY">01-15-2024</option>
                            <option value="YYYYMMDD">20240115</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="date-position">Position:</label>
                        <select
                            id="date-position"
                            value={options.position || 'prefix'}
                            onChange={(e) => setOptions({ ...options, position: e.target.value as 'prefix' | 'suffix' })}
                            disabled={disabled}
                        >
                            <option value="prefix">Before name</option>
                            <option value="suffix">After name</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="date-separator">Separator:</label>
                        <input
                            id="date-separator"
                            type="text"
                            value={options.separator || '_'}
                            onChange={(e) => setOptions({ ...options, separator: e.target.value })}
                            placeholder="_"
                            maxLength={5}
                            disabled={disabled}
                        />
                    </div>
                </div>
            );

        case 'remove-text':
            return (
                <div className="options-form">
                    <div className="form-group">
                        <label htmlFor="remove-type">Remove:</label>
                        <select
                            id="remove-type"
                            value={options.removeType || 'start'}
                            onChange={(e) => setOptions({ ...options, removeType: e.target.value as any })}
                            disabled={disabled}
                        >
                            <option value="start">From Start</option>
                            <option value="end">From End</option>
                            <option value="all">All Occurrences</option>
                        </select>
                    </div>
                    {(options.removeType === 'start' || options.removeType === 'end') && (
                        <div className="form-group">
                            <label htmlFor="char-count">Character Count:</label>
                            <input
                                id="char-count"
                                type="number"
                                min="1"
                                value={options.charCount || 1}
                                onChange={(e) => setOptions({ ...options, charCount: parseInt(e.target.value) || 1 })}
                                disabled={disabled}
                            />
                        </div>
                    )}
                    {options.removeType === 'all' && (
                        <div className="form-group">
                            <label htmlFor="remove-text">Text to Remove:</label>
                            <input
                                id="remove-text"
                                type="text"
                                value={options.text || ''}
                                onChange={(e) => setOptions({ ...options, text: e.target.value })}
                                placeholder="Text to remove"
                                disabled={disabled}
                            />
                        </div>
                    )}
                </div>
            );

        case 'custom-pattern':
            return (
                <div className="options-form">
                    <div className="form-group">
                        <label htmlFor="custom-pattern">Pattern:</label>
                        <input
                            id="custom-pattern"
                            type="text"
                            value={options.customPattern || ''}
                            onChange={(e) => setOptions({ ...options, customPattern: e.target.value })}
                            placeholder="{name}_{counter}"
                            disabled={disabled}
                        />
                    </div>
                    <div className="pattern-help">
                        <strong>Available variables:</strong>
                        <ul>
                            <li><code>{'{name}'}</code> - Original filename (without extension)</li>
                            <li><code>{'{ext}'}</code> - File extension</li>
                            <li><code>{'{counter}'}</code> - Sequential number (001, 002, ...)</li>
                            <li><code>{'{date}'}</code> - Current date (YYYY-MM-DD)</li>
                            <li><code>{'{time}'}</code> - Current time (HH-MM-SS)</li>
                            <li><code>{'{parent}'}</code> - Parent folder name</li>
                        </ul>
                        <strong>Examples:</strong>
                        <ul>
                            <li><code>Photo_{'{counter}'}_{'{date}'}</code> → Photo_001_2024-01-15</li>
                            <li><code>{'{name}'}_backup_{'{time}'}</code> → document_backup_14-30-25</li>
                        </ul>
                    </div>
                </div>
            );

        default:
            return <div className="options-form">Select a pattern to configure options</div>;
    }
}
