# Contributing

## Page baselines

Every public page has one full-page baseline of the page as it first loads. The home page and the stores page also have a full-page baseline with the activity menu open, a full-page baseline with Daily selected in the activity filter, and a full-page baseline with Table selected so the place list is visible instead of the map.

CI runs `scripts/check-baselines.sh`. It checks that each file in the table exists, that `401.html` has none, and that both deploy workflows still exclude `baselines/**` and `**/baselines/**` as their own lines.

Each image is 1440 CSS pixels wide and shows the page from the top of the header through the bottom of the footer.

| Page | Baseline |
| --- | --- |
| `index.html` | `baselines/website-home.png` |
| `index.html`, activity menu open | `baselines/website-home-activity.png` |
| `index.html`, Daily selected | `baselines/website-home-daily.png` |
| `index.html`, Table selected | `baselines/website-home-table.png` |
| `what-is-open-cryptopay.html` | `baselines/website-what-is-open-cryptopay.png` |
| `ecosystem.html` | `baselines/website-ecosystem.png` |
| `stores.html` | `baselines/website-stores.png` |
| `stores.html`, activity menu open | `baselines/website-stores-activity.png` |
| `stores.html`, Daily selected | `baselines/website-stores-daily.png` |
| `stores.html`, Table selected | `baselines/website-stores-table.png` |
| `shop.php` (`/{npub}`) | `baselines/website-shop.png` |

A new public page adds its baseline in the same change. A change to a page's markup, style, or copy updates that page's baseline in the same change. A change to the activity filter also updates the open-menu baseline and the Daily baseline of that page. The open-menu image shows All, Daily, Weekly, Monthly, Idle, and None. A change to the table view also updates the Table baseline of that page. The Table image shows Table pressed, the map hidden, and the place table visible, with Activity still on All. On the home page that field is the same height as the map and the rows scroll inside it. On the stores page the table is as tall as its rows.

Places loaded from the map API can differ from the image. That difference alone does not require a new baseline.

The shop page is rendered against the fixed sample shop in `baselines/shop-sample/`, so live shop data never changes its baseline. Its map loads live tiles, which can differ from the image; that difference alone does not require a new baseline. That folder also holds the steps to render it again.

`401.html` is the password gate. It is not a public page and has no baseline.

The deploy workflows exclude `baselines/**` and `**/baselines/**` from the site upload. Leave that exclusion in place.

## Shop page hosting

`/{npub}` is served by `shop.php` through the rewrite rules in `.htaccess`. The host needs PHP 8 with the curl extension and Apache with `mod_rewrite` and `mod_headers`, with `AllowOverride FileInfo` (or `All`) for the document root so `.htaccess` applies. Without curl every shop page answers 503, because only curl bounds the whole API call, DNS lookup included, to 3 seconds.

## A38

This repository follows the A38 standard in DFXswiss/agent
([docs/a38.md](https://github.com/DFXswiss/agent/blob/e63980625f5b778c5a93104b0bf5de7fb5e379a8/docs/a38.md#adopting-a38-in-a-repository),
[docs/a38-guard.md](https://github.com/DFXswiss/agent/blob/e63980625f5b778c5a93104b0bf5de7fb5e379a8/docs/a38-guard.md)).

Two reviews are required before Ready. One review is enough only when the
pull request opener is listed in one_review_authors in the trusted
.github/pr-guard.json on the default branch. A missing file, a missing key,
or an empty list keeps two reviews required. An entry that exists only on
the pull request head does not count.

- [`.github/a38.json`](.github/a38.json) lists the pull-request jobs the author measures locally.
- [`.github/pr-guard.json`](.github/pr-guard.json) enforces A38 on `develop`. `main` is the release pull request and stays out of scope. `workflow_approval.workflows` stays required when approval is enabled and does not filter: after an enforce pass the guard approves every initial held fork `pull_request` run.
- [`.github/workflows/a38-guard.yml`](.github/workflows/a38-guard.yml) is `dfx pr guard`. The action is pinned to a commit. The job does not check out the pull request.

