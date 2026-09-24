import { type ViewerItem } from "./items.js";
export type { ViewerItem } from "./items.js";
export { shouldLoadMore, changedIndices, FallbackTracker, LOAD_MORE_THRESHOLD } from "./items.js";
export interface ViewerLabels {
    close: string;
    prev: string;
    next: string;
    zoom: string;
    download: string;
    error: string;
}
export interface ViewerOptions {
    items: ViewerItem[];
    index: number;
    /** More items exist past the end of `items`; `loadMore` fetches them. */
    hasMore?: boolean;
    /** Fetch the next page, then hand it over with `setItems`. */
    loadMore?: () => Promise<void> | void;
    onIndexChange?: (index: number) => void;
    /** Called once the viewer has closed, whoever closed it. */
    onClose?: () => void;
    labels?: Partial<ViewerLabels>;
}
export interface ViewerHandle {
    /** Replace the list. Closes the viewer if the image on screen no longer exists. */
    setItems(items: ViewerItem[], hasMore?: boolean): void;
    goTo(index: number): void;
    readonly index: number;
    close(): void;
    /** Close without calling `onClose` -- for a parent that is already closing. */
    destroy(): void;
}
/**
 * Opens a full-screen viewer over the page. Swipe or arrow keys move between
 * images, pinch / double-tap / wheel zoom, a vertical drag or Esc closes.
 */
export declare function openViewer(options: ViewerOptions): ViewerHandle;
