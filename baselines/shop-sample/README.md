# Shop page sample

`baselines/website-shop.png` is `shop.php` rendered against this fixed sample
shop, so live shop data never changes it. The map loads live tiles, which can
differ from the image; that alone does not require a new baseline. The shop's
name, description and address contain quotes, tags and `</script>`; the image
shows them as text. The first caption holds the same characters; it only
appears in the page source (`data-caption`, `alt`) and in the photo viewer,
where it is escaped too. The sample has a Google Maps link, so the image
shows the Google Maps row.

Render it locally (PHP 8 with the curl extension):

```sh
php -S 127.0.0.1:8462 baselines/shop-sample/sample-api.php &
OCP_SHOP_API=http://127.0.0.1:8462 php -S 127.0.0.1:8461 baselines/shop-sample/router.php
```

Then open `http://127.0.0.1:8461/npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6`
at 1440 CSS pixels wide and capture the full page. `OCP_SHOP_API` is read only
by PHP's built-in server; Apache uses the fixed production and dev API URLs.

The baseline uses the default of three photos. Start the sample API with
`OCP_SAMPLE_PHOTOS=1` to `10` to look at the other gallery layouts; those
views are not baselines.

The same sample serves the other answers: the hex key
`3bf0c63f…459d` answers 301, an unknown npub 404, and
`npub1qqqq…qqqq` a broken answer, which the page shows as 503.
