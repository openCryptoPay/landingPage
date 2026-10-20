# Contributing

## Page baselines

Every public page has one full-page baseline image.

CI runs `scripts/check-baselines.sh`. It checks that each public page in the table has its baseline, that `401.html` has none, and that both deploy workflows still exclude `baselines/**` and `**/baselines/**` as their own lines.

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

## A38

This repository follows the A38 standard in DFXswiss/agent
([docs/a38.md](https://github.com/DFXswiss/agent/blob/88581c74937b8f3eaaccad637d1a7d7b34fe68a2/docs/a38.md#adopting-a38-in-a-repository),
[docs/a38-guard.md](https://github.com/DFXswiss/agent/blob/88581c74937b8f3eaaccad637d1a7d7b34fe68a2/docs/a38-guard.md)).

- [`.github/a38.json`](.github/a38.json) lists the pull-request jobs the author measures locally.
- [`.github/pr-guard.json`](.github/pr-guard.json) enforces A38 on `develop`. `main` is the release pull request and stays out of scope. `workflow_approval` releases the listed fork `pull_request` jobs after an enforce pass.
- [`.github/workflows/a38-guard.yml`](.github/workflows/a38-guard.yml) is `dfx pr guard`. The action is pinned to a commit. The job does not check out the pull request.

