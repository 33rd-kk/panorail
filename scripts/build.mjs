// tsc emits the JS and types; this adds the stylesheet: PhotoSwipe's own,
// then ours, so a consumer imports one file.
import { execSync } from "node:child_process"
import { readFileSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
rmSync("dist", { recursive: true, force: true })
execSync("npx tsc -p tsconfig.json", { stdio: "inherit" })
const base = readFileSync(require.resolve("photoswipe/style.css"), "utf8")
const ours = readFileSync("src/panorail.css", "utf8")
writeFileSync("dist/style.css", `${base}\n${ours}`)
