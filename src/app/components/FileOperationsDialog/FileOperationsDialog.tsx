import React, { useState, useEffect } from 'react';
import { fileOperationsManager, FileHash, SplitFileInfo, ComparisonResult } from '../../utils/FileOperationsManager';
import './FileOperationsDialog.scss';

interface FileOperationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  selectedFiles: string[];
}

type OperationType = 'hash' | 'compare' | 'merge' | 'split' | 'checksum' | 'duplicates';
type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256';

export const FileOperationsDialog: React.FC<FileOperationsDialogProps> = ({
  isOpen,
  onClose,
  currentPath,
  selectedFiles,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<OperationType>('hash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Hash state
  const [hashAlgorithm, setHashAlgorithm] = useState<HashAlgorithm>('SHA-256');
  const [hashResult, setHashResult] = useState<FileHash | null>(null);
  const [hashHistory, setHashHistory] = useState<FileHash[]>([]);

  // Compare state
  const [compareFile1, setCompareFile1] = useState('');
  const [compareFile2, setCompareFile2] = useState('');
  const [compareMode, setCompareMode] = useState<'binary' | 'text'>('binary');
  const [compareResult, setCompareResult] = useState<ComparisonResult | null>(null);

  // Merge state
  const [mergeFiles, setMergeFiles] = useState<string[]>([]);
  const [mergeOutput, setMergeOutput] = useState('');
  const [mergeSeparator, setMergeSeparator] = useState('\\n');
  const [mergeAddHeaders, setMergeAddHeaders] = useState(false);

  // Split state
  const [splitFile, setSplitFile] = useState('');
  const [splitPartSize, setSplitPartSize] = useState(10); // MB
  const [splitOutput, setSplitOutput] = useState('');
  const [splitResult, setSplitResult] = useState<SplitFileInfo | null>(null);

  // Checksum state
  const [checksumFiles, setChecksumFiles] = useState<string[]>([]);
  const [checksumOutput, setChecksumOutput] = useState('');
  const [checksumVerifyPath, setChecksumVerifyPath] = useState('');
  const [checksumVerifyResult, setChecksumVerifyResult] = useState<any>(null);

  // Duplicates state
  const [duplicatesDir, setDuplicatesDir] = useState(currentPath);
  const [duplicatesRecursive, setDuplicatesRecursive] = useState(true);
  const [duplicatesResult, setDuplicatesResult] = useState<Map<string, string[]> | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHashHistory();
      if (selectedFiles.length > 0) {
        setCompareFile1(selectedFiles[0]);
        if (selectedFiles.length > 1) {
          setCompareFile2(selectedFiles[1]);
        }
        setMergeFiles(selectedFiles);
        setSplitFile(selectedFiles[0]);
        setChecksumFiles(selectedFiles);
      }
    }
  }, [isOpen, selectedFiles]);

  const loadHashHistory = () => {
    setHashHistory(fileOperationsManager.getHashHistory(20));
  };

  const handleCalculateHash = async () => {
    if (!selectedFiles[0]) return;

    setIsProcessing(true);
    try {
      const result = await fileOperationsManager.calculateHash(selectedFiles[0], hashAlgorithm);
      setHashResult(result);
      loadHashHistory();
    } catch (error) {
      console.error('Error calculating hash:', error);
      alert(`Error: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompareFiles = async () => {
    if (!compareFile1 || !compareFile2) {
      alert('Please select two files to compare');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await fileOperationsManager.compareFiles(compareFile1, compareFile2, compareMode);
      setCompareResult(result);
    } catch (error) {
      console.error('Error comparing files:', error);
      alert(`Error: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMergeFiles = async () => {
    if (mergeFiles.length === 0) {
      alert('Please select files to merge');
      return;
    }
    if (!mergeOutput) {
      alert('Please specify output file');
      return;
    }

    setIsProcessing(true);
    try {
      await fileOperationsManager.mergeFiles({
        files: mergeFiles,
        outputPath: mergeOutput,
        separator: mergeSeparator.replace(/\\n/g, '\n').replace(/\\t/g, '\t'),
        addHeaders: mergeAddHeaders,
      });
      alert(`Successfully merged ${mergeFiles.length} files`);
    } catch (error) {
      console.error('Error merging files:', error);
      alert(`Error: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSplitFile = async () => {
    if (!splitFile) {
      alert('Please select a file to split');
      return;
    }
    if (!splitOutput) {
      alert('Please specify output directory');
      return;
    }
    if (splitPartSize <= 0) {
      alert('Part size must be greater than 0');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await fileOperationsManager.splitFile({
        file: splitFile,
        outputDir: splitOutput,
        partSize: splitPartSize * 1024 * 1024, // Convert MB to bytes
      });
      setSplitResult(result);
      alert(`Successfully split file into ${result.parts.length} parts`);
    } catch (error) {
      console.error('Error splitting file:', error);
      alert(`Error: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateChecksum = async () => {
    if (checksumFiles.length === 0) {
      alert('Please select files');
      return;
    }
    if (!checksumOutput) {
      alert('Please specify output file');
      return;
    }

    setIsProcessing(true);
    try {
      await fileOperationsManager.generateChecksumFile(checksumFiles, checksumOutput, hashAlgorithm);
      alert('Checksum file generated successfully');
    } catch (error) {
      console.error('Error generating checksum:', error);
      alert(`Error: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyChecksum = async () => {
    if (!checksumVerifyPath) {
      alert('Please specify checksum file');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await fileOperationsManager.verifyChecksumFile(checksumVerifyPath, currentPath);
      setChecksumVerifyResult(result);
    } catch (error) {
      console.error('Error verifying checksum:', error);
      alert(`Error: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFindDuplicates = async () => {
    if (!duplicatesDir) {
      alert('Please specify directory');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await fileOperationsManager.findDuplicates(duplicatesDir, duplicatesRecursive, hashAlgorithm);
      setDuplicatesResult(result);
    } catch (error) {
      console.error('Error finding duplicates:', error);
      alert(`Error: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleExportHistory = () => {
    const csv = fileOperationsManager.exportHashHistory();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hash-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="file-operations-overlay" onClick={onClose}>
      <div className="file-operations-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="file-operations-header">
          <h2>🛠️ Advanced File Operations</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="file-operations-tabs">
          <button
            className={activeTab === 'hash' ? 'active' : ''}
            onClick={() => setActiveTab('hash')}
          >
            🔐 Hash
          </button>
          <button
            className={activeTab === 'compare' ? 'active' : ''}
            onClick={() => setActiveTab('compare')}
          >
            ⚖️ Compare
          </button>
          <button
            className={activeTab === 'merge' ? 'active' : ''}
            onClick={() => setActiveTab('merge')}
          >
            🔗 Merge
          </button>
          <button
            className={activeTab === 'split' ? 'active' : ''}
            onClick={() => setActiveTab('split')}
          >
            ✂️ Split
          </button>
          <button
            className={activeTab === 'checksum' ? 'active' : ''}
            onClick={() => setActiveTab('checksum')}
          >
            ✅ Checksum
          </button>
          <button
            className={activeTab === 'duplicates' ? 'active' : ''}
            onClick={() => setActiveTab('duplicates')}
          >
            🔍 Duplicates
          </button>
        </div>

        <div className="file-operations-content">
          {/* Hash Tab */}
          {activeTab === 'hash' && (
            <div className="hash-tab">
              <div className="operation-section">
                <h3>Calculate Hash</h3>
                <div className="form-group">
                  <label>File:</label>
                  <input type="text" value={selectedFiles[0] || ''} readOnly />
                </div>
                <div className="form-group">
                  <label>Algorithm:</label>
                  <select value={hashAlgorithm} onChange={(e) => setHashAlgorithm(e.target.value as HashAlgorithm)}>
                    <option value="MD5">MD5</option>
                    <option value="SHA-1">SHA-1</option>
                    <option value="SHA-256">SHA-256</option>
                  </select>
                </div>
                <button onClick={handleCalculateHash} disabled={isProcessing || !selectedFiles[0]}>
                  Calculate Hash
                </button>
              </div>

              {hashResult && (
                <div className="result-section">
                  <h3>Result</h3>
                  <div className="hash-result">
                    <strong>{hashResult.algorithm}:</strong>
                    <div className="hash-value">
                      {hashResult.value}
                      <button onClick={() => handleCopyToClipboard(hashResult.value)}>📋 Copy</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="history-section">
                <div className="history-header">
                  <h3>Recent Hashes</h3>
                  <button onClick={handleExportHistory}>Export</button>
                </div>
                <div className="history-list">
                  {hashHistory.map((hash, index) => (
                    <div key={index} className="history-item">
                      <div className="history-info">
                        <strong>{hash.algorithm}</strong>
                        <span>{hash.file.split(/[/\\]/).pop()}</span>
                      </div>
                      <div className="history-hash">
                        {hash.value.substring(0, 16)}...
                        <button onClick={() => handleCopyToClipboard(hash.value)}>📋</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Compare Tab */}
          {activeTab === 'compare' && (
            <div className="compare-tab">
              <div className="operation-section">
                <h3>Compare Files</h3>
                <div className="form-group">
                  <label>File 1:</label>
                  <input type="text" value={compareFile1} onChange={(e) => setCompareFile1(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>File 2:</label>
                  <input type="text" value={compareFile2} onChange={(e) => setCompareFile2(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Mode:</label>
                  <select value={compareMode} onChange={(e) => setCompareMode(e.target.value as 'binary' | 'text')}>
                    <option value="binary">Binary</option>
                    <option value="text">Text</option>
                  </select>
                </div>
                <button onClick={handleCompareFiles} disabled={isProcessing}>
                  Compare
                </button>
              </div>

              {compareResult && (
                <div className="result-section">
                  <h3>Comparison Result</h3>
                  <div className={`comparison-result ${compareResult.identical ? 'identical' : 'different'}`}>
                    <div className="result-status">
                      {compareResult.identical ? '✅ Files are identical' : '❌ Files differ'}
                    </div>
                    <div className="result-similarity">
                      Similarity: {compareResult.similarity.toFixed(2)}%
                    </div>
                    {compareResult.differences.length > 0 && (
                      <div className="differences-list">
                        <h4>Differences ({compareResult.differences.length}):</h4>
                        {compareResult.differences.slice(0, 10).map((diff, index) => (
                          <div key={index} className="difference-item">
                            {diff.line !== undefined && <span>Line {diff.line}</span>}
                            {diff.position !== undefined && <span>Position {diff.position}</span>}
                            {diff.type === 'text' && (
                              <>
                                <div>Expected: {diff.expected}</div>
                                <div>Actual: {diff.actual}</div>
                              </>
                            )}
                          </div>
                        ))}
                        {compareResult.differences.length > 10 && (
                          <div>... and {compareResult.differences.length - 10} more</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Merge Tab */}
          {activeTab === 'merge' && (
            <div className="merge-tab">
              <div className="operation-section">
                <h3>Merge Files</h3>
                <div className="form-group">
                  <label>Files ({mergeFiles.length}):</label>
                  <div className="file-list">
                    {mergeFiles.map((file, index) => (
                      <div key={index}>{file.split(/[/\\]/).pop()}</div>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Output File:</label>
                  <input type="text" value={mergeOutput} onChange={(e) => setMergeOutput(e.target.value)} placeholder={`${currentPath}/merged.txt`} />
                </div>
                <div className="form-group">
                  <label>Separator:</label>
                  <input type="text" value={mergeSeparator} onChange={(e) => setMergeSeparator(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>
                    <input type="checkbox" checked={mergeAddHeaders} onChange={(e) => setMergeAddHeaders(e.target.checked)} />
                    Add file headers
                  </label>
                </div>
                <button onClick={handleMergeFiles} disabled={isProcessing}>
                  Merge Files
                </button>
              </div>
            </div>
          )}

          {/* Split Tab */}
          {activeTab === 'split' && (
            <div className="split-tab">
              <div className="operation-section">
                <h3>Split File</h3>
                <div className="form-group">
                  <label>File:</label>
                  <input type="text" value={splitFile} onChange={(e) => setSplitFile(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Part Size (MB):</label>
                  <input type="number" value={splitPartSize} onChange={(e) => setSplitPartSize(Number(e.target.value))} min="1" />
                </div>
                <div className="form-group">
                  <label>Output Directory:</label>
                  <input type="text" value={splitOutput} onChange={(e) => setSplitOutput(e.target.value)} placeholder={currentPath} />
                </div>
                <button onClick={handleSplitFile} disabled={isProcessing}>
                  Split File
                </button>
              </div>

              {splitResult && (
                <div className="result-section">
                  <h3>Split Result</h3>
                  <div>Total Parts: {splitResult.parts.length}</div>
                  <div>Original Size: {(splitResult.totalSize / (1024 * 1024)).toFixed(2)} MB</div>
                  <div>Part Size: {(splitResult.partSize / (1024 * 1024)).toFixed(2)} MB</div>
                </div>
              )}
            </div>
          )}

          {/* Checksum Tab */}
          {activeTab === 'checksum' && (
            <div className="checksum-tab">
              <div className="operation-section">
                <h3>Generate Checksum</h3>
                <div className="form-group">
                  <label>Files ({checksumFiles.length}):</label>
                  <div className="file-list">
                    {checksumFiles.map((file, index) => (
                      <div key={index}>{file.split(/[/\\]/).pop()}</div>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Algorithm:</label>
                  <select value={hashAlgorithm} onChange={(e) => setHashAlgorithm(e.target.value as HashAlgorithm)}>
                    <option value="MD5">MD5</option>
                    <option value="SHA-1">SHA-1</option>
                    <option value="SHA-256">SHA-256</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Output File:</label>
                  <input type="text" value={checksumOutput} onChange={(e) => setChecksumOutput(e.target.value)} placeholder={`${currentPath}/checksums.txt`} />
                </div>
                <button onClick={handleGenerateChecksum} disabled={isProcessing}>
                  Generate
                </button>
              </div>

              <div className="operation-section">
                <h3>Verify Checksum</h3>
                <div className="form-group">
                  <label>Checksum File:</label>
                  <input type="text" value={checksumVerifyPath} onChange={(e) => setChecksumVerifyPath(e.target.value)} />
                </div>
                <button onClick={handleVerifyChecksum} disabled={isProcessing}>
                  Verify
                </button>
              </div>

              {checksumVerifyResult && (
                <div className="result-section">
                  <h3>Verification Result</h3>
                  <div className="verify-stats">
                    <div className="stat success">✅ Verified: {checksumVerifyResult.verified.length}</div>
                    <div className="stat error">❌ Failed: {checksumVerifyResult.failed.length}</div>
                    <div className="stat warning">⚠️ Missing: {checksumVerifyResult.missing.length}</div>
                  </div>
                  {checksumVerifyResult.failed.length > 0 && (
                    <div className="failed-list">
                      <h4>Failed:</h4>
                      {checksumVerifyResult.failed.map((file: string, index: number) => (
                        <div key={index}>{file}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Duplicates Tab */}
          {activeTab === 'duplicates' && (
            <div className="duplicates-tab">
              <div className="operation-section">
                <h3>Find Duplicates</h3>
                <div className="form-group">
                  <label>Directory:</label>
                  <input type="text" value={duplicatesDir} onChange={(e) => setDuplicatesDir(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Algorithm:</label>
                  <select value={hashAlgorithm} onChange={(e) => setHashAlgorithm(e.target.value as HashAlgorithm)}>
                    <option value="MD5">MD5 (fastest)</option>
                    <option value="SHA-1">SHA-1</option>
                    <option value="SHA-256">SHA-256 (most secure)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <input type="checkbox" checked={duplicatesRecursive} onChange={(e) => setDuplicatesRecursive(e.target.checked)} />
                    Search subdirectories
                  </label>
                </div>
                <button onClick={handleFindDuplicates} disabled={isProcessing}>
                  Find Duplicates
                </button>
              </div>

              {duplicatesResult && (
                <div className="result-section">
                  <h3>Duplicate Files Found: {duplicatesResult.size}</h3>
                  <div className="duplicates-list">
                    {Array.from(duplicatesResult.entries()).map(([hash, files], index) => (
                      <div key={index} className="duplicate-group">
                        <div className="duplicate-header">
                          Group {index + 1} ({files.length} files)
                        </div>
                        {files.map((file, fileIndex) => (
                          <div key={fileIndex} className="duplicate-file">
                            {file}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {isProcessing && (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <span>Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
};
