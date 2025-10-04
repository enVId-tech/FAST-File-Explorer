/**
 * PerformanceMonitor.ts
 * Track application performance, memory usage, operation timing
 */

export interface PerformanceMetric {
  timestamp: number;
  cpuUsage: number; // percentage
  memoryUsage: number; // MB
  operation?: string;
  duration?: number; // ms
}

export interface OperationTiming {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
}

class PerformanceMonitorClass {
  private static instance: PerformanceMonitorClass;
  private metrics: PerformanceMetric[] = [];
  private operations: OperationTiming[] = [];
  private maxMetrics = 1000;
  private maxOperations = 500;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  private constructor() {
    this.loadHistory();
    this.startMonitoring();
  }

  public static getInstance(): PerformanceMonitorClass {
    if (!PerformanceMonitorClass.instance) {
      PerformanceMonitorClass.instance = new PerformanceMonitorClass();
    }
    return PerformanceMonitorClass.instance;
  }

  /**
   * Load performance history from storage
   */
  private loadHistory(): void {
    try {
      const metricsData = localStorage.getItem('performance_metrics');
      if (metricsData) {
        this.metrics = JSON.parse(metricsData).slice(-this.maxMetrics);
      }

      const opsData = localStorage.getItem('performance_operations');
      if (opsData) {
        this.operations = JSON.parse(opsData).slice(-this.maxOperations);
      }
    } catch (error) {
      console.error('Error loading performance history:', error);
    }
  }

  /**
   * Save performance history to storage
   */
  private saveHistory(): void {
    try {
      localStorage.setItem('performance_metrics', JSON.stringify(this.metrics.slice(-this.maxMetrics)));
      localStorage.setItem('performance_operations', JSON.stringify(this.operations.slice(-this.maxOperations)));
    } catch (error) {
      console.error('Error saving performance history:', error);
    }
  }

  /**
   * Start monitoring performance
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.captureMetrics();
    }, 5000); // Every 5 seconds
  }

  /**
   * Stop monitoring performance
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Capture current metrics
   */
  private captureMetrics(): void {
    const memory = (performance as any).memory;
    const metric: PerformanceMetric = {
      timestamp: Date.now(),
      cpuUsage: this.estimateCPUUsage(),
      memoryUsage: memory ? memory.usedJSHeapSize / (1024 * 1024) : 0,
    };

    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Periodically save
    if (this.metrics.length % 10 === 0) {
      this.saveHistory();
    }
  }

  /**
   * Estimate CPU usage based on frame rate
   */
  private estimateCPUUsage(): number {
    // Simple estimation: measure frame rate
    // Lower frame rate = higher CPU usage
    const fps = 60; // Assume 60fps baseline
    const currentFps = this.measureFPS();
    return Math.max(0, Math.min(100, ((fps - currentFps) / fps) * 100));
  }

  /**
   * Measure current FPS
   */
  private measureFPS(): number {
    // Simplified FPS measurement
    return 60; // Placeholder - in real app would measure actual FPS
  }

  /**
   * Start tracking an operation
   */
  public startOperation(operation: string): string {
    const operationId = `${operation}-${Date.now()}`;
    (window as any)[`perf_${operationId}`] = Date.now();
    return operationId;
  }

  /**
   * End tracking an operation
   */
  public endOperation(operationId: string, success: boolean = true, error?: string): void {
    const startTime = (window as any)[`perf_${operationId}`];
    if (!startTime) return;

    const endTime = Date.now();
    const duration = endTime - startTime;

    const operation: OperationTiming = {
      operation: operationId.split('-')[0],
      startTime,
      endTime,
      duration,
      success,
      error,
    };

    this.operations.push(operation);
    if (this.operations.length > this.maxOperations) {
      this.operations.shift();
    }

    delete (window as any)[`perf_${operationId}`];
    this.saveHistory();
  }

  /**
   * Measure operation execution time
   */
  public async measureOperation<T>(
    operation: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const operationId = this.startOperation(operation);

    try {
      const result = await fn();
      this.endOperation(operationId, true);
      return result;
    } catch (error) {
      this.endOperation(operationId, false, String(error));
      throw error;
    }
  }

  /**
   * Get current metrics
   */
  public getCurrentMetrics(): PerformanceMetric | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(limit?: number): PerformanceMetric[] {
    return limit ? this.metrics.slice(-limit) : [...this.metrics];
  }

  /**
   * Get operations history
   */
  public getOperationsHistory(limit?: number): OperationTiming[] {
    return limit ? this.operations.slice(-limit) : [...this.operations];
  }

  /**
   * Get statistics for a specific operation
   */
  public getOperationStats(operation: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    successRate: number;
  } {
    const ops = this.operations.filter(op => op.operation === operation);

    if (ops.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
      };
    }

    const durations = ops.map(op => op.duration);
    const successCount = ops.filter(op => op.success).length;

    return {
      count: ops.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: (successCount / ops.length) * 100,
    };
  }

  /**
   * Get all operation types
   */
  public getOperationTypes(): string[] {
    const types = new Set(this.operations.map(op => op.operation));
    return Array.from(types);
  }

  /**
   * Clear history
   */
  public clearHistory(type?: 'metrics' | 'operations'): void {
    if (!type || type === 'metrics') {
      this.metrics = [];
    }
    if (!type || type === 'operations') {
      this.operations = [];
    }
    this.saveHistory();
  }

  /**
   * Export diagnostics to JSON
   */
  public exportDiagnostics(): string {
    const diagnostics = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      currentMetrics: this.getCurrentMetrics(),
      metricsHistory: this.metrics,
      operationsHistory: this.operations,
      operationTypes: this.getOperationTypes().map(type => ({
        operation: type,
        stats: this.getOperationStats(type),
      })),
      systemInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        memory: (performance as any).memory ? {
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        } : null,
      },
    };

    return JSON.stringify(diagnostics, null, 2);
  }

  /**
   * Get average metrics over time period
   */
  public getAverageMetrics(minutes: number = 5): {
    avgCPU: number;
    avgMemory: number;
    peakCPU: number;
    peakMemory: number;
  } {
    const cutoffTime = Date.now() - minutes * 60 * 1000;
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return { avgCPU: 0, avgMemory: 0, peakCPU: 0, peakMemory: 0 };
    }

    const cpuValues = recentMetrics.map(m => m.cpuUsage);
    const memoryValues = recentMetrics.map(m => m.memoryUsage);

    return {
      avgCPU: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length,
      avgMemory: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
      peakCPU: Math.max(...cpuValues),
      peakMemory: Math.max(...memoryValues),
    };
  }

  /**
   * Check if monitoring is active
   */
  public isActive(): boolean {
    return this.isMonitoring;
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitorClass.getInstance();
