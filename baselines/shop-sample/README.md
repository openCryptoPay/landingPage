# Shop page sample

`baselines/website-shop.png` is `shop.php` rendered against this fixed sample
shop, so live data never changes it. The shop's name, description, address and
first caption contain quotes, tags and `</script>`; the image shows them as
text.

Render it locally (PHP 8):

```sh
php -S 127.0.0.1:8462 baselines/shop-sample/sample-api.php &
OCP_SHOP_API=http://127.0.0.1:8462 php -S 127.0.0.1:8461 baselines/shop-sample/router.php
```

Then open `http://127.0.0.1:8461/npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6`
at 1440 CSS pixels wide and capture the full page. `OCP_SHOP_API` is read only
by PHP's built-in server; Apache uses the fixed production and dev API URLs.

The same sample serves the other answers: the hex key
`3bf0c63f…459d` answers 301, an unknown npub 404, and
`npub1qqqq…qqqq` a broken answer, which the page shows as 503.
