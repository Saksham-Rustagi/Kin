Polish **only `src/dash/page.ts`**, Kin's "Kin's thinking" dashboard, which judges will see on the laptop at noon. Read CLAUDE.md first. Don't touch other files, don't restart anything and don't commit. You have about 20 minutes, so keep the changes surgical.

Fix these three things:
1. **Fill the screen.** At 1440×900 and 1280×800 the two panels ("Live decisions" and "Memory map") must stretch to the bottom of the viewport. Right now the lower ~40% of the page is empty. Use flex/grid with `height: calc(100vh - <header>)`. The decisions feed scrolls inside its panel, and the memory map uses the full panel height.
2. **Memory map: no overlapping text.** Node labels currently overlap: "Mike" is hidden behind "Linda", and the edge labels "lives in" and "dog" collide with node names.
   - Increase node spacing and collision radius in the layout, so the label width counts toward collision.
   - Draw each node label as a small pill with a semi-opaque white background directly under its node.
   - Draw edge labels at the edge midpoint in a smaller pill, and hide an edge label if its box would overlap any node or node label.
   - Recompute on resize.
   - Keep the existing Frutiger Aero look and the existing event handling (add_node / add_link / highlight / photos).
3. **Empty state for "Live decisions":** when the feed has no family decisions yet, show a friendly placeholder ("Waiting for a family message… Kin stays quiet unless it can help.") instead of only system log lines.

Then run `node_modules/.bin/tsc -p tsconfig.json`, which must exit 0. Final answer: what changed, in 5 lines.
