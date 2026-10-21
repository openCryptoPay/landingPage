# Review

## Page baselines

Reject the change when any of these is true:

- A public page was added and its `baselines/website-<page>.png` file is missing.
- A public page's markup, style, or copy changed and its baseline still shows the previous page.
- The home or stores activity filter changed and `baselines/website-home-daily.png` or `baselines/website-stores-daily.png` still shows the previous page.
- `401.html` has a baseline, or a public page listed below lost its baseline.
- A deploy workflow no longer excludes `baselines/**` and `**/baselines/**`.

Each baseline is one full page, 1440 CSS pixels wide, from the header through the footer. The Daily files are the same pages with Daily selected in the activity filter.

| Page | Baseline |
| --- | --- |
| `index.html` | `baselines/website-home.png` |
| `index.html`, Daily selected | `baselines/website-home-daily.png` |
| `what-is-open-cryptopay.html` | `baselines/website-what-is-open-cryptopay.png` |
| `ecosystem.html` | `baselines/website-ecosystem.png` |
| `stores.html` | `baselines/website-stores.png` |
| `stores.html`, Daily selected | `baselines/website-stores-daily.png` |
| `shop.php` (`/{npub}`) | `baselines/website-shop.png` |

`401.html` is the password gate and has no baseline. Data loaded from the map API may differ from the image; that alone is not a reason to reject.
