# panorail

A full-screen image viewer for galleries. It works with React, Vue, or plain DOM code.

It is a thin layer over [PhotoSwipe 5](https://photoswipe.com/) (MIT). Gestures come from PhotoSwipe. panorail adds the parts an image gallery needs on top.

**Gestures (from PhotoSwipe)**
- Swipe to move between images.
- Pinch, double-tap, or the mouse wheel to zoom.
- Drag down or press Esc to close.

**Added by panorail**
- **Paging.** It asks for the next page when you get close to the end of the list.
- **Fallback URL.** If an image fails to load, it tries the fallback URL once.
- **Referrer policy per image.**
- **Images without a known size.** It measures them after they load.
- **A save button.**
- **A side panel the host fills.** A button in the bar, or the `i` key, shows and hides it.
- **Buttons of your own in the bar.** You render their icons; the viewer places and styles them.
- **A veil.** Blurs the images you pick, from before they load.
- **Captions and a counter.**
- **Safe areas.** The controls stay clear of phone notches and the home indicator.

## Install

```sh
npm install github:33rd-kk/panorail#v0.2.2
```

`dist/` is committed to the repository, so installing needs no build step.

## Use

```ts
import { openViewer } from "panorail"
import "panorail/style.css"

const viewer = openViewer({
  items: [{ src: "/a.png", name: "a.png", width: 1024, height: 1536 }],
  index: 0,
  hasMore: true,
  loadMore: async () => {
    const next = await fetchNextPage()
    viewer.setItems(next.all, next.hasMore)
  },
  onIndexChange: (i) => console.log("now on", i),
  onClose: () => console.log("closed"),
})
```

## API

### Item fields

| Field | Description |
| --- | --- |
| `src` | The image URL. |
| `fallbackSrc` | Tried once if `src` fails to load. |
| `name` | Shown as the caption and used as the alt text. |
| `downloadName` | When set, the save button appears and downloads the image under this filename. It stays hidden for an image URL that is not http(s), blob, or `data:image/`. |
| `referrerPolicy` | Referrer policy for this image's request. |
| `width`, `height` | The image's natural size. Pass them if you know them. If you don't, panorail measures the image once it loads. |

### Panel

Pass `panel` to add a panel you fill yourself, such as an image's tags. From 768px wide it is a column on the right; below that it is a sheet at the bottom. While it is open, the image shrinks to fit beside or above it.

```ts
openViewer({
  items,
  index,
  panel: {
    open: localStorage.getItem("panel") === "1",
    onToggle: (open) => localStorage.setItem("panel", open ? "1" : "0"),
    // Render into `el` however you like: a React portal, a Vue Teleport, plain DOM.
    mount: (el) => {
      el.textContent = "..."
      return () => { /* called when the viewer goes away */ }
    },
  },
})
```

| Field | Description |
| --- | --- |
| `open` | Whether the panel starts open. |
| `onToggle(open)` | Called when the button or the `i` key opens or closes the panel. |
| `mount(el)` | Called once with the panel's element. A function it returns is called when the viewer goes away. |

The panel does not follow the image on screen by itself. Use `onIndexChange` to update what you render in it. Mouse wheel scrolling over the panel scrolls the panel and does not zoom the image.

### Buttons

Pass `buttons` to add buttons of your own to the bar, such as a switch for something in your app. They sit after the counter and before the viewer's own buttons, in the order you give.

```ts
openViewer({
  items,
  index,
  buttons: [
    {
      label: "Blur pictures",
      onClick: () => setBlur(!blur),
      // `el` is the <button>. Render its icon however you like and set any state on it.
      mount: (el) => {
        el.append(blurIcon())
        el.setAttribute("aria-pressed", String(blur))
        return () => { /* called when the viewer goes away */ }
      },
    },
  ],
})
```

| Field | Description |
| --- | --- |
| `label` | The button's tooltip and accessible name. |
| `onClick()` | Called when the button is clicked, while the viewer is open. |
| `mount(el)` | Called once with the `<button>` element. A function it returns is called when the viewer goes away. |

The button takes no HTML string: what goes in it is up to `mount`. An `<svg>` in it is sized and coloured like the viewer's own icons. Set `hidden` on the button to hide it.

### Veil

Pass `veil` to blur some or all images, for example while a privacy mode is on. It is called with each item and blurs the image when it returns `true`. The blur is set before the image starts loading, so a veiled image never shows sharp, not even the next or previous one while you swipe. If `veil` throws, the image is blurred.

```ts
const viewer = openViewer({
  items,
  index,
  veil: (item) => privacyMode && item.src !== revealedSrc,
})
// Later, when the mode or the revealed image changes:
viewer.setVeil(privacyMode ? (item) => item.src !== revealedSrc : undefined)
```

To change how strong the blur is, set `--panorail-veil-blur` (default `32px`) on `.panorail`.

### Methods on the returned handle

| Method | Description |
| --- | --- |
| `setItems(items, hasMore?)` | Replaces the list. If the image on screen is no longer in the list, the viewer closes. |
| `goTo(index)` | Moves to the image at `index`. |
| `close()` | Closes the viewer, then calls `onClose`. |
| `destroy()` | Closes the viewer at once without calling `onClose`. Use it when your own component is being torn down. |
| `setPanelOpen(open)` | Opens or closes the panel, when there is one. Does not call `onToggle`. |
| `setVeil(veil?)` | Replaces `veil` and applies it to the images already loaded. Pass nothing to blur none. |

### Labels

The default labels are in Japanese. Change them with `labels: { close, prev, next, zoom, download, error, panel }`.

## Development

```sh
npm install
npm test
npm run build   # rebuild dist/ before tagging a release
```

## License

MIT. Includes PhotoSwipe, © Dmytro Semenov, under the MIT license.
