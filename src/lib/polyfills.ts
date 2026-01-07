/**
 * Polyfills for older mobile browsers (iOS 14+, Android 9+)
 * Import this file in your root layout or _app.tsx
 */

// Polyfill for Promise.allSettled (iOS 14, Android 9)
if (!Promise.allSettled) {
    (Promise as any).allSettled = function (promises: Promise<any>[]) {
        return Promise.all(
            promises.map((p: Promise<any>) =>
                Promise.resolve(p).then(
                    (value: any) => ({ status: 'fulfilled' as const, value }),
                    (reason: any) => ({ status: 'rejected' as const, reason })
                )
            )
        );
    };
}

// Polyfill for String.prototype.replaceAll (iOS 14, Android 9)
if (!String.prototype.replaceAll) {
    (String.prototype as any).replaceAll = function (search: string, replacement: string) {
        return this.split(search).join(replacement);
    };
}

// Polyfill for Array.prototype.at (iOS 14, Android 9)
if (!Array.prototype.at) {
    (Array.prototype as any).at = function (index: number) {
        const len = this.length;
        const relativeIndex = index >= 0 ? index : len + index;
        if (relativeIndex < 0 || relativeIndex >= len) return undefined;
        return this[relativeIndex];
    };
}

// Polyfill for Object.hasOwn (iOS 14, Android 9)
if (!Object.hasOwn) {
    (Object as any).hasOwn = function (obj: any, prop: string) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
    };
}

// Polyfill for structuredClone (iOS 14, Android 9)
if (typeof structuredClone === 'undefined') {
    (globalThis as any).structuredClone = function structuredClone(obj: any) {
        return JSON.parse(JSON.stringify(obj));
    };
}

// Ensure fetch is available (should be in most browsers, but just in case)
if (typeof fetch === 'undefined') {
    console.warn('fetch API not available - some features may not work');
}

// IntersectionObserver polyfill check
if (typeof IntersectionObserver === 'undefined') {
    console.warn('IntersectionObserver not available - lazy loading may not work');
}

export { };
