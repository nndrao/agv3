import React, { useEffect, useState } from 'react';

interface PerformanceMetricsProps {
  updatesPerSecond: number;
  isRunning: boolean;
  totalRows: number;
  showMetrics: boolean;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

declare global {
  interface Performance {
    memory?: MemoryInfo;
  }
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  updatesPerSecond,
  isRunning,
  totalRows,
  showMetrics
}) => {
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);

  useEffect(() => {
    if (!showMetrics) return;

    // Monitor memory usage
    const memoryInterval = setInterval(() => {
      if (performance.memory) {
        const usedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
        setMemoryUsage(usedMB);
      }
    }, 1000);

    // Monitor FPS
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    return () => {
      clearInterval(memoryInterval);
      cancelAnimationFrame(animationId);
    };
  }, [showMetrics]);

  if (!showMetrics) return null;

  const getPerformanceClass = (value: number, highThreshold: number, lowThreshold: number): string => {
    if (value >= highThreshold) return 'high';
    if (value >= lowThreshold) return 'medium';
    return 'low';
  };

  return (
    <div className="performance-metrics">
      <h3>Performance Metrics</h3>
      
      <div className="metric-row">
        <span className="metric-label">Updates/sec:</span>
        <span className={`metric-value ${getPerformanceClass(updatesPerSecond, 100000, 50000)}`}>
          {updatesPerSecond.toLocaleString()}
        </span>
      </div>
      
      <div className="metric-row">
        <span className="metric-label">FPS:</span>
        <span className={`metric-value ${getPerformanceClass(fps, 50, 30)}`}>
          {fps}
        </span>
      </div>
      
      <div className="metric-row">
        <span className="metric-label">Memory:</span>
        <span className="metric-value">
          {memoryUsage} MB
        </span>
      </div>
      
      <div className="metric-row">
        <span className="metric-label">Total Rows:</span>
        <span className="metric-value">
          {totalRows.toLocaleString()}
        </span>
      </div>
      
      <div className="metric-row">
        <span className="metric-label">Status:</span>
        <span className={`metric-value ${isRunning ? 'high' : 'low'}`}>
          {isRunning ? 'Running' : 'Idle'}
        </span>
      </div>
    </div>
  );
};