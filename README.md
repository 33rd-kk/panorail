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
- **Captions and a counter.**
- **Safe areas.** The controls stay clear of phone notches and the home indicator.

## Install

```sh
npm install github:33rd-kk/panorail#v0.1.0
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
| `downloadName` | When set, the save button appears and downloads the image under this filename. |
| `referrerPolicy` | Referrer policy for this image's request. |
| `width`, `height` | The image's natural size. Pass them if you know them. If you don't, panorail measures the image once it loads. |

### Methods on the returned handle

| Method | Description |
| --- | --- |
| `setItems(items, hasMore?)` | Replaces the list. If the image on screen is no longer in the list, the viewer closes. |
| `goTo(index)` | Moves to the image at `index`. |
| `close()` | Closes the viewer, then calls `onClose`. |
| `destroy()` | Closes the viewer at once without calling `onClose`. Use it when your own component is being torn down. |

### Labels

The default labels are in Japanese. Change them with `labels: { close, prev, next, zoom, download, error }`.

## Development

```sh
npm install
npm test
npm run build   # rebuild dist/ before tagging a release
```

## License

MIT. Includes PhotoSwipe, © Dmytro Semenov, under the MIT license.
