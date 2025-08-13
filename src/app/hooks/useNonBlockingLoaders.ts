import React, { useState, useEffect } from 'react';

// Progressive component loader that prevents freezing
export const useProgressiveLoader = () => {
    const [loadedComponents, setLoadedComponents] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);

    const loadComponent = (componentName: string, loader: () => Promise<any>) => {
        if (loadedComponents.has(componentName)) {
            return Promise.resolve();
        }

        setIsLoading(true);
        
        return new Promise<void>((resolve) => {
            // Use multiple async strategies to prevent blocking
            const loadAsync = async () => {
                try {
                    // Load component in next tick to avoid blocking
                    await new Promise(r => setTimeout(r, 0));
                    await loader();
                    
                    setLoadedComponents(prev => new Set(prev).add(componentName));
                    resolve();
                } catch (error) {
                    console.error(`Failed to load component ${componentName}:`, error);
                    resolve(); // Don't fail the whole app
                }
            };

            // Use the most appropriate async method available
            if ('requestIdleCallback' in window) {
                (window as any).requestIdleCallback(loadAsync, { timeout: 50 });
            } else if ('MessageChannel' in window) {
                const channel = new MessageChannel();
                channel.port1.onmessage = () => loadAsync();
                channel.port2.postMessage(null);
            } else {
                setTimeout(loadAsync, 0);
            }
        }).finally(() => {
            setIsLoading(false);
        });
    };

    const isComponentLoaded = (componentName: string) => {
        return loadedComponents.has(componentName);
    };

    return {
        loadComponent,
        isComponentLoaded,
        isLoading,
        loadedCount: loadedComponents.size
    };
};

// Streaming data loader for file system operations
export const useStreamingLoader = <T>(
    loader: () => Promise<T[]>,
    batchSize: number = 50
) => {
    const [data, setData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalItems, setTotalItems] = useState(0);

    const load = async () => {
        setIsLoading(true);
        setError(null);
        setData([]);

        try {
            const allData = await loader();
            setTotalItems(allData.length);

            // Stream data in batches to prevent UI blocking
            let currentIndex = 0;
            const streamBatch = () => {
                if (currentIndex >= allData.length) {
                    setIsLoading(false);
                    return;
                }

                const batch = allData.slice(currentIndex, currentIndex + batchSize);
                setData(prev => [...prev, ...batch]);
                currentIndex += batchSize;

                // Schedule next batch
                if ('requestIdleCallback' in window) {
                    (window as any).requestIdleCallback(streamBatch, { timeout: 16 });
                } else {
                    setTimeout(streamBatch, 16); // ~60fps
                }
            };

            streamBatch();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
            setIsLoading(false);
        }
    };

    return {
        data,
        isLoading,
        error,
        load,
        progress: totalItems > 0 ? (data.length / totalItems) * 100 : 0
    };
};

// Non-blocking initialization hook
export const useNonBlockingInit = (
    initializers: Array<{
        name: string;
        init: () => Promise<void>;
        critical?: boolean;
    }>
) => {
    const [initialized, setInitialized] = useState<Record<string, boolean>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        let mounted = true;

        const runInitializers = async () => {
            // Run critical initializers first, non-critical in background
            const critical = initializers.filter(init => init.critical);
            const nonCritical = initializers.filter(init => !init.critical);

            // Critical initializers (still non-blocking but prioritized)
            for (const { name, init } of critical) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI
                    await init();
                    if (mounted) {
                        setInitialized(prev => ({ ...prev, [name]: true }));
                    }
                } catch (error) {
                    console.error(`Critical init failed: ${name}`, error);
                    if (mounted) {
                        setErrors(prev => ({ 
                            ...prev, 
                            [name]: error instanceof Error ? error.message : 'Init failed'
                        }));
                    }
                }
            }

            if (mounted) {
                setIsReady(true); // App is ready even if non-critical init fails
            }

            // Non-critical initializers (background)
            for (const { name, init } of nonCritical) {
                const runNonCritical = async () => {
                    try {
                        await init();
                        if (mounted) {
                            setInitialized(prev => ({ ...prev, [name]: true }));
                        }
                    } catch (error) {
                        console.error(`Non-critical init failed: ${name}`, error);
                        if (mounted) {
                            setErrors(prev => ({ 
                                ...prev, 
                                [name]: error instanceof Error ? error.message : 'Init failed'
                            }));
                        }
                    }
                };

                // Schedule non-critical init
                if ('requestIdleCallback' in window) {
                    (window as any).requestIdleCallback(runNonCritical);
                } else {
                    setTimeout(runNonCritical, 100);
                }
            }
        };

        runInitializers();

        return () => {
            mounted = false;
        };
    }, [initializers]);

    return {
        initialized,
        errors,
        isReady,
        allCriticalReady: initializers
            .filter(init => init.critical)
            .every(init => initialized[init.name]),
        allReady: initializers.every(init => initialized[init.name])
    };
};
