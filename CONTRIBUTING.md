# Contributing

## Page baselines

Every public page has one full-page baseline image.

The image is 1440 CSS pixels wide and shows the page from the top of the header through the bottom of the footer. It lives at `baselines/website-<page>.png`.

| Page | Baseline |
| --- | --- |
| `index.html` | `baselines/website-home.png` |
| `what-is-open-cryptopay.html` | `baselines/website-what-is-open-cryptopay.png` |
| `ecosystem.html` | `baselines/website-ecosystem.png` |
| `stores.html` | `baselines/website-stores.png` |

A new public page adds its baseline in the same change. A change to a page's markup, style, or copy updates that page's baseline in the same change.

Places loaded from the map API can differ from the image. That difference alone does not require a new baseline.

`401.html` is the password gate. It is not a public page and has no baseline.

The deploy workflows exclude `baselines/**` and `**/baselines/**` from the site upload. Leave that exclusion in place.
