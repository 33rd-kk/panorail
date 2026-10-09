import { type ViewerItem } from "./items.js";
export type { ViewerItem } from "./items.js";
export { shouldLoadMore, changedIndices, isSafeLinkUrl, FallbackTracker, LOAD_MORE_THRESHOLD } from "./items.js";
export interface ViewerLabels {
    close: string;
    prev: string;
    next: string;
    zoom: string;
    download: string;
    error: string;
    panel: string;
}
export interface ViewerPanel {
    /** Whether the panel starts open. */
    open?: boolean;
    /** Called when the viewer's button or the `i` key opens or closes the panel. */
    onToggle?: (open: boolean) => void;
    /**
     * Called once with the panel's element, for the host to render into (a React
     * portal, a Vue Teleport, plain DOM). A function returned is called when the
     * viewer goes away.
     */
    mount: (el: HTMLElement) => void | (() => void);
}
export interface ViewerButton {
    /** The button's tooltip and accessible name. */
    label: string;
    onClick?: () => void;
    /**
     * Called once with the button, for the host to render its icon into (a React
     * portal, a Vue Teleport, plain DOM) and set any state on it, such as
     * `aria-pressed`. A function returned is called when the viewer goes away.
     */
    mount: (el: HTMLButtonElement) => void | (() => void);
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
    /** A side panel, shown and hidden from a button in the bar, that the host fills. */
    panel?: ViewerPanel;
    /** Buttons of the host's own, in the bar after the counter and before the viewer's buttons. */
    buttons?: ViewerButton[];
    /**
     * Blurs the images it returns true for, such as every image while a privacy
     * mode is on. Applied before an image loads, so it never shows sharp.
     * `setVeil` changes it later.
     */
    veil?: (item: ViewerItem) => boolean;
}
export interface ViewerHandle {
    /** Replace the list. Closes the viewer if the image on screen no longer exists. */
    setItems(items: ViewerItem[], hasMore?: boolean): void;
    goTo(index: number): void;
    readonly index: number;
    close(): void;
    /** Close without calling `onClose` -- for a parent that is already closing. */
    destroy(): void;
    /** Opens or closes the panel, when there is one. Does not call `onToggle`. */
    setPanelOpen(open: boolean): void;
    /** Replaces `veil` and applies it to the images already loaded. Pass nothing to blur none. */
    setVeil(veil?: (item: ViewerItem) => boolean): void;
}
/**
 * Opens a full-screen viewer over the page. Swipe or arrow keys move between
 * images, pinch / double-tap / wheel zoom, a vertical drag or Esc closes.
 */
export declare function openViewer(options: ViewerOptions): ViewerHandle;
