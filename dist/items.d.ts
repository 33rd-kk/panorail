export interface ViewerItem {
    src: string;
    /** Tried once if `src` fails to load. */
    fallbackSrc?: string;
    /** Shown as the caption, and used as the image's alt text. */
    name?: string;
    /** When set, a save button downloads the image under this filename. */
    downloadName?: string;
    referrerPolicy?: ReferrerPolicy;
    /** Natural size, if known. Without it the size is measured once the image loads. */
    width?: number;
    height?: number;
}
/** How close to the end of the list the viewer asks for the next page. */
export declare const LOAD_MORE_THRESHOLD = 2;
export declare function shouldLoadMore(index: number, length: number, hasMore: boolean, inFlight: boolean, threshold?: number): boolean;
/**
 * Indices whose slide must be rebuilt after the list is replaced: anything
 * that is new, or that now shows a different image.
 */
export declare function changedIndices(prev: readonly ViewerItem[], next: readonly ViewerItem[]): number[];
/**
 * Tracks which images have switched to their fallback, so each item gets
 * exactly one retry however many times its slide is rebuilt.
 */
export declare class FallbackTracker {
    private used;
    /** The source to load for `item`, or `null` once there is nothing left to try. */
    nextSource(item: ViewerItem, failed: boolean): string | null;
    current(item: ViewerItem): string;
}
/** Whether `url` may be put in a link's href: http(s), blob, or an image data URL. */
export declare function isSafeLinkUrl(url: string, base?: string): boolean;
