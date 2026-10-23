<?php
// Router for `php -S`, the same paths as /.htaccess: a trailing slash
// redirects (locally to the relative path, without the cache header), an npub
// or 64 hex characters go to shop.php, files are served.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/(npub1[02-9ac-hj-np-z]{58}|[0-9a-f]{64})/$#', $path, $m) === 1) {
    header('Location: /' . $m[1], true, 301);
    return true;
}
if (preg_match('#^/(npub1[02-9ac-hj-np-z]{58}|[0-9a-f]{64})$#', $path, $m) === 1) {
    $_GET = ['id' => $m[1]];
    require __DIR__ . '/../../shop.php';
    return true;
}
return false;
