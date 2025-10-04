import React, { useState, useEffect } from 'react';
import { performanceMonitor, PerformanceMetric, OperationTiming } from '../../utils/PerformanceMonitor';
import './PerformancePanel.scss';

interface PerformancePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PerformancePanel: React.FC<PerformancePanelProps> = ({ isOpen, onClose }) => {
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetric | null>(null);
  const [recentMetrics, setRecentMetrics] = useState<PerformanceMetric[]>([]);
  const [operations, setOperations] = useState<OperationTiming[]>([]);
  const [averageMetrics, setAverageMetrics] = useState({ avgCPU: 0, avgMemory: 0, peakCPU: 0, peakMemory: 0 });
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [operationStats, setOperationStats] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updateMetrics = () => {
      setCurrentMetrics(performanceMonitor.getCurrentMetrics());
      setRecentMetrics(performanceMonitor.getMetricsHistory(60)); // Last 60 samples (5 minutes)
      setOperations(performanceMonitor.getOperationsHistory(50));
      setAverageMetrics(performanceMonitor.getAverageMetrics(5));
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (selectedOperation) {
      setOperationStats(performanceMonitor.getOperationStats(selectedOperation));
    }
  }, [selectedOperation]);

  const handleExportDiagnostics = () => {
    const diagnostics = performanceMonitor.exportDiagnostics();
    const blob = new Blob([diagnostics], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearHistory = (type?: 'metrics' | 'operations') => {
    if (window.confirm(`Clear ${type || 'all'} history?`)) {
      performanceMonitor.clearHistory(type);
      setRecentMetrics([]);
      setOperations([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="performance-overlay" onClick={onClose}>
      <div className="performance-panel" onClick={(e) => e.stopPropagation()}>
        <div className="performance-header">
          <h2>📊 Performance Monitor</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="performance-content">
          {/* Current Metrics */}
          <div className="metrics-section">
            <h3>Current Status</h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">CPU Usage</div>
                <div className="metric-value">{currentMetrics?.cpuUsage.toFixed(1) || 0}%</div>
                <div className="metric-bar">
                  <div
                    className="metric-fill cpu"
                    style={{ width: `${currentMetrics?.cpuUsage || 0}%` }}
                  />
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Memory Usage</div>
                <div className="metric-value">{currentMetrics?.memoryUsage.toFixed(1) || 0} MB</div>
                <div className="metric-bar">
                  <div
                    className="metric-fill memory"
                    style={{ width: `${Math.min(100, (currentMetrics?.memoryUsage || 0) / 5)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Average Metrics (Last 5 minutes) */}
          <div className="metrics-section">
            <h3>Last 5 Minutes</h3>
            <div className="metrics-grid">
              <div className="metric-card small">
                <div className="metric-label">Avg CPU</div>
                <div className="metric-value">{averageMetrics.avgCPU.toFixed(1)}%</div>
              </div>
              <div className="metric-card small">
                <div className="metric-label">Peak CPU</div>
                <div className="metric-value">{averageMetrics.peakCPU.toFixed(1)}%</div>
              </div>
              <div className="metric-card small">
                <div className="metric-label">Avg Memory</div>
                <div className="metric-value">{averageMetrics.avgMemory.toFixed(1)} MB</div>
              </div>
              <div className="metric-card small">
                <div className="metric-label">Peak Memory</div>
                <div className="metric-value">{averageMetrics.peakMemory.toFixed(1)} MB</div>
              </div>
            </div>
          </div>

          {/* Recent Operations */}
          <div className="operations-section">
            <div className="section-header">
              <h3>Recent Operations ({operations.length})</h3>
              <select
                value={selectedOperation}
                onChange={(e) => setSelectedOperation(e.target.value)}
              >
                <option value="">All Operations</option>
                {performanceMonitor.getOperationTypes().map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {selectedOperation && operationStats && (
              <div className="stats-card">
                <h4>{selectedOperation} Statistics</h4>
                <div className="stats-grid">
                  <div>Count: {operationStats.count}</div>
                  <div>Avg: {operationStats.avgDuration.toFixed(2)}ms</div>
                  <div>Min: {operationStats.minDuration.toFixed(2)}ms</div>
                  <div>Max: {operationStats.maxDuration.toFixed(2)}ms</div>
                  <div>Success Rate: {operationStats.successRate.toFixed(1)}%</div>
                </div>
              </div>
            )}

            <div className="operations-list">
              {operations.slice().reverse().slice(0, 20).map((op, index) => (
                <div
                  key={index}
                  className={`operation-item ${op.success ? 'success' : 'failed'}`}
                >
                  <div className="operation-info">
                    <span className="operation-name">{op.operation}</span>
                    <span className="operation-duration">{op.duration.toFixed(2)}ms</span>
                  </div>
                  <div className="operation-time">
                    {new Date(op.startTime).toLocaleTimeString()}
                  </div>
                  {op.error && <div className="operation-error">{op.error}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="actions-section">
            <button onClick={handleExportDiagnostics}>
              💾 Export Diagnostics
            </button>
            <button onClick={() => handleClearHistory('operations')}>
              🗑️ Clear Operations
            </button>
            <button onClick={() => handleClearHistory('metrics')}>
              🗑️ Clear Metrics
            </button>
            <button onClick={() => handleClearHistory()}>
              ⚠️ Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
