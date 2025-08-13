import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface VirtualizedListProps {
    itemCount: number;
    itemHeight: number; // fixed height in pixels
    overscan?: number; // number of items to render above and below the viewport
    className?: string;
    style?: React.CSSProperties;
    renderItem: (index: number) => React.ReactNode;
}

/**
 * Simple, dependency-free vertical list virtualization.
 * Assumes fixed item height for fast math and minimal layout thrash.
 */
export const VirtualizedList: React.FC<VirtualizedListProps> = ({
    itemCount,
    itemHeight,
    overscan = 8,
    className,
    style,
    renderItem,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);

    const onScroll = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        setScrollTop(el.scrollTop);
    }, []);

    // Track viewport size for proper range calculation
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const resizeObserver = new ResizeObserver(() => {
            setViewportHeight(el.clientHeight);
        });
        resizeObserver.observe(el);
        setViewportHeight(el.clientHeight);
        return () => resizeObserver.disconnect();
    }, []);

    const { startIndex, endIndex, offsetY } = useMemo(() => {
        const firstVisibleIndex = Math.floor(scrollTop / itemHeight);
        const visibleCount = Math.ceil((viewportHeight || 0) / itemHeight);
        const start = Math.max(0, firstVisibleIndex - overscan);
        const end = Math.min(itemCount, firstVisibleIndex + visibleCount + overscan);
        const offset = start * itemHeight;
        return { startIndex: start, endIndex: end, offsetY: offset };
    }, [scrollTop, viewportHeight, itemHeight, overscan, itemCount]);

    const totalHeight = itemCount * itemHeight;

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                overflowY: 'auto',
                position: 'relative',
                ...style,
            }}
            onScroll={onScroll}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${offsetY}px)` }}>
                    {Array.from({ length: Math.max(0, endIndex - startIndex) }).map((_, i) => {
                        const index = startIndex + i;
                        return (
                            <div key={index} style={{ height: itemHeight }}>
                                {renderItem(index)}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default VirtualizedList;
