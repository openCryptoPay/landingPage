<?php
/*
 * Shop page: https://opencryptopay.io/{npub}. .htaccess rewrites the npub, or
 * the 64 hex characters of the key, to this file. The page reads one shop from
 * GET /map/places/{npub} of the OpenCryptoPay API and writes it into the HTML,
 * so a shared link shows the shop's name and photo. Every value from the API is
 * source data and is escaped for its context.
 */

declare(strict_types=1);

const NPUB_PATTERN = '/^npub1[02-9ac-hj-np-z]{58}$/';
const HEX_PATTERN = '/^[0-9a-f]{64}$/';
const SITE_ORIGIN = 'https://opencryptopay.io';
const SITE_OG_IMAGE = 'https://cdn.prod.website-files.com/670cd765309520b679461de0/67c0616aa3943106098c3e7b_og_image.png';
const API_TIMEOUT_SECONDS = 3;
/** Largest API answer the page reads; a shop answer is a few kilobytes. */
const API_MAX_BYTES = 1048576;
/** The page shows at most the API's 10 photos, 50 payment pairs (100 characters per name) and 1000 characters per text. */
const PHOTOS_MAX = 10;
const SUPPORTS_MAX = 50;
const TEXT_MAX = 1000;
/** Grid cells of the gallery; further photos open in the viewer from the last cell. */
const GALLERY_CELLS = 5;

/** Text and attribute values. */
function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** JSON for a script block or JSON-LD: no tag, ampersand or quote survives as-is. */
function js($value): string
{
    return (string) json_encode(
        $value,
        JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
    );
}

/**
 * The first $max characters of a string. Without mbstring a UTF-8 pattern cuts
 * by character; only text that is not valid UTF-8 is cut by bytes.
 */
function cut(string $value, int $max): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max);
    }
    return preg_match('/^.{0,' . $max . '}/su', $value, $match) === 1 ? $match[0] : substr($value, 0, $max);
}

/** A string field of the API answer, trimmed and cut to TEXT_MAX characters, or ''. */
function field(array $data, string $key): string
{
    return isset($data[$key]) && is_string($data[$key]) ? cut(trim($data[$key]), TEXT_MAX) : '';
}

/**
 * The API base: the dev API for exactly the two dev host names that
 * js/ocp-places.js lists, the production API for any other host. The URL is
 * never built from the Host header. The PHP built-in server used for the page
 * baseline may point it at a local sample API through OCP_SHOP_API; Apache
 * never runs as that server.
 */
function apiBase(): string
{
    if (PHP_SAPI === 'cli-server') {
        $local = getenv('OCP_SHOP_API');
        if (is_string($local) && $local !== '') {
            return $local;
        }
    }
    $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    $host = preg_replace('/:\d+$/', '', $host);
    if ($host === 'dev.opencryptopay.io' || $host === 'www.dev.opencryptopay.io') {
        return 'https://dev-api.opencryptopay.io';
    }
    return 'https://api.opencryptopay.io';
}

/**
 * GET /map/places/{id} with curl, without following redirects. The whole call
 * (DNS, connect and transfer) is limited to 3 seconds, and an answer above
 * API_MAX_BYTES is cut off and treated as an error. The page needs the PHP
 * curl extension; without it every call fails and the page answers 503,
 * because no other PHP HTTP client bounds the DNS lookup.
 *
 * @return array{status:int, location:string, body:string}|null null on a network error, a timeout,
 *     an answer above API_MAX_BYTES, or without curl
 */
function fetchPlace(string $id): ?array
{
    $url = apiBase() . '/map/places/' . rawurlencode($id);
    if (!function_exists('curl_init')) {
        return null;
    }
    $location = '';
    $body = '';
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$body): int {
            if (strlen($body) + strlen($chunk) > API_MAX_BYTES) {
                return 0;
            }
            $body .= $chunk;
            return strlen($chunk);
        },
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_TIMEOUT_MS => API_TIMEOUT_SECONDS * 1000,
        CURLOPT_CONNECTTIMEOUT_MS => API_TIMEOUT_SECONDS * 1000,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
        CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$location): int {
            if (stripos($line, 'Location:') === 0) {
                $location = trim(substr($line, strlen('Location:')));
            }
            return strlen($line);
        },
    ]);
    $done = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    return $done === true && $status > 0 ? ['status' => $status, 'location' => $location, 'body' => $body] : null;
}

/** Activity in words. */
function activityText(string $activity): string
{
    switch ($activity) {
        case 'daily':
            return 'Payments almost every day';
        case 'within7Days':
            return 'Payments in the last 7 days';
        case 'within30Days':
            return 'Payments in the last 30 days';
        case 'olderThan30Days':
            return 'No payments in the last 30 days';
        default:
            return 'No payments recorded yet';
    }
}

/** A photo entry of the API answer, or null when it is not one. */
function photoOf($photo): ?array
{
    if (!is_array($photo) || !isset($photo['url']) || !is_string($photo['url'])) {
        return null;
    }
    $sample = PHP_SAPI === 'cli-server' && preg_match('#^http://127\.0\.0\.1:\d+/[^\s"<>]+$#', $photo['url']) === 1;
    if (!$sample && preg_match('#^https://[^\s"<>]+$#', $photo['url']) !== 1) {
        return null;
    }
    return [
        'url' => $photo['url'],
        'width' => isset($photo['width']) && is_int($photo['width']) ? $photo['width'] : null,
        'height' => isset($photo['height']) && is_int($photo['height']) ? $photo['height'] : null,
        'caption' => isset($photo['caption']) && is_string($photo['caption'])
            ? cut(trim($photo['caption']), 200)
            : '',
    ];
}

/** Send the page head, nav and the opening of the main section. */
function pageStart(string $title, string $description, string $image, ?string $canonical, string $extraHead = ''): void
{
    ?><!DOCTYPE html>
<html data-wf-page="670cd765309520b679461dde" data-wf-site="670cd765309520b679461de0" lang="en">
<head>
  <meta charset="utf-8">
  <title><?= h($title) ?></title>
  <meta content="<?= h($description) ?>" name="description">
  <meta content="<?= h($title) ?>" property="og:title">
  <meta content="<?= h($description) ?>" property="og:description">
  <meta content="<?= h($image) ?>" property="og:image">
  <meta content="<?= h($title) ?>" property="twitter:title">
  <meta content="<?= h($description) ?>" property="twitter:description">
  <meta content="<?= h($image) ?>" property="twitter:image">
  <meta property="og:type" content="website">
  <meta content="summary_large_image" name="twitter:card">
  <meta content="width=device-width, initial-scale=1" name="viewport">
  <link href="/css/normalize.css" rel="stylesheet" type="text/css">
  <link href="/css/webflow.css" rel="stylesheet" type="text/css">
  <link href="/css/opencryptopay.webflow.css" rel="stylesheet" type="text/css">
  <link href="/css/ocp-places.css" rel="stylesheet" type="text/css">
  <link href="/css/maplibre-gl.css" rel="stylesheet" type="text/css">
  <link href="/css/ocp-shop.css" rel="stylesheet" type="text/css">
  <link href="https://fonts.googleapis.com" rel="preconnect">
  <link href="https://fonts.gstatic.com" rel="preconnect" crossorigin="anonymous">
  <script src="https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js" type="text/javascript"></script>
  <script type="text/javascript">WebFont.load({  google: {    families: ["Barlow:100,100italic,200,200italic,300,300italic,regular,italic,500,500italic,600,600italic,700,700italic,800,800italic,900,900italic","Inter:100,200,300,regular,500,600,700,800,900,100italic,200italic,300italic,italic,500italic,600italic,700italic,800italic,900italic"]  }});</script>
  <script type="text/javascript">!function(o,c){var n=c.documentElement,t=" w-mod-";n.className+=t+"js",("ontouchstart"in o||o.DocumentTouch&&c instanceof DocumentTouch)&&(n.className+=t+"touch")}(window,document);</script>
  <link href="/images/favicon.png" rel="shortcut icon" type="image/x-icon">
  <link href="/images/webclip.png" rel="apple-touch-icon">
<?php if ($canonical !== null) { ?>
  <link href="<?= h($canonical) ?>" rel="canonical">
<?php } ?>
<?= $extraHead ?>
</head>
<body>
  <div data-animation="default" data-collapse="medium" data-duration="400" data-easing="ease" data-easing2="ease" role="banner" class="navbar-3 w-nav">
    <div class="container-large-3">
      <div class="nav-wrapper">
        <div class="nav-left">
          <a href="/index.html" class="brand-3 w-nav-brand" aria-label="Open CryptoPay home"><img src="/images/Open_CryptoPay_logo_full.svg" loading="lazy" alt="" class="image"></a>
        </div>
        <nav role="navigation" class="nav-menu-2 w-nav-menu">
          <a href="/what-is-open-cryptopay.html" class="nav-link-2 w-nav-link">What is Open CryptoPay?</a>
          <a href="/#How-to-offer-OpenCryptoPay" class="nav-link-2 w-nav-link">How to offer Open CryptoPay</a>
          <a href="/ecosystem.html" class="nav-link-2 w-nav-link">Ecosystem</a>
          <div class="frame-427322438"></div>
          <div class="div-block-5">
            <a href="https://github.com/openCryptoPay/landingPage?tab=readme-ov-file#open-cryptopay" class="button-style mobile-only">
              <div class="w-layout-vflex container-11"><img width="24" height="24" alt="" src="/images/Social-icons.svg" loading="lazy" class="social-icons">
                <div class="text-23">Documentation</div>
              </div>
            </a>
          </div>
        </nav>
        <div class="nav-right">
          <a href="https://github.com/openCryptoPay/landingPage?tab=readme-ov-file#open-cryptopay" target="_blank" class="button-style desktop-only">
            <div class="w-layout-vflex container-11"><img src="/images/Social-icons.svg" loading="lazy" width="24" height="24" alt="" class="social-icons">
              <div class="text-23">Documentation</div>
            </div>
          </a>
          <div class="menu-button-2 w-nav-button">
            <div class="icon w-icon-nav-menu"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <section class="section_home-map">
    <div class="padding-global padding-section-map ocp-stores-page">
      <div class="container-main">
<?php
}

/** Close the main section and send the shared brand block and scripts. */
function pageEnd(bool $withShopScript): void
{
    ?>
      </div>
    </div>
  </section>
  <article class="footer-ecosystem brand-assets">
    <div class="container-6">
      <div class="div-block-22">
        <div class="headline-42">
          <div class="title-3">Brand Assets</div>
        </div>
        <div class="right-2">
          <div class="block-1">
            <div class="block-1">
              <div class="body-1-white">Check out our GitHub repository for brand assets, including Open CryptoPay logos and brand guidelines.</div>
              <a href="https://github.com/openCryptoPay/landingPage/tree/main/media" target="_blank" class="text-button-2 w-inline-block">
                <div class="body-2-stronger">Click here</div>
                <div class="div-block-39"><img loading="lazy" src="/images/arrow_outward-1.svg" alt="" class="image-17"><img width="18" height="18" alt="" src="/images/arrow_outward_white.svg" loading="lazy" class="vectors-wrapper-1507"></div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </article>
  <script src="https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=670cd765309520b679461de0" type="text/javascript" integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=" crossorigin="anonymous"></script>
  <script src="/js/webflow.js" type="text/javascript"></script>
<?php if ($withShopScript) { ?>
  <script src="/js/maplibre-gl.js" type="text/javascript"></script>
  <script src="/js/ocp-shop.js" type="text/javascript"></script>
<?php } ?>
</body>
</html>
<?php
}

/** A short page for 404 and 503. */
function messagePage(int $status, string $title, string $text, bool $retry): void
{
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: ' . ($status === 503 ? 'no-store' : 'public, max-age=60'));
    pageStart($title . ' – Open CryptoPay', $text, SITE_OG_IMAGE, null, "  <meta name=\"robots\" content=\"noindex\">\n");
    ?>
        <div class="ocp-shop-message">
          <h2 class="large-title left"><?= h($title) ?></h2>
          <p class="paragraph gray"><?= h($text) ?></p>
<?php if ($retry) { ?>
          <p><a class="ocp-shop-button" href="">Try again</a></p>
<?php } ?>
          <p><a class="ocp-shop-link" href="/stores.html">All stores</a></p>
        </div>
<?php
    pageEnd(false);
}

$id = isset($_GET['id']) && is_string($_GET['id']) ? $_GET['id'] : '';
if (preg_match(NPUB_PATTERN, $id) !== 1 && preg_match(HEX_PATTERN, $id) !== 1) {
    messagePage(404, 'Shop not found', 'There is no shop at this address.', false);
    exit;
}

$answer = fetchPlace($id);
$status = $answer === null ? 0 : $answer['status'];

// The API answers a hex key with 301 to its npub and an npub with 200 for exactly that npub;
// any other pairing is treated as a broken answer.
$isHex = preg_match(HEX_PATTERN, $id) === 1;
if ($status === 301 && $answer !== null && $isHex) {
    $target = basename((string) parse_url($answer['location'], PHP_URL_PATH));
    if (preg_match(NPUB_PATTERN, $target) === 1) {
        header('Cache-Control: public, max-age=60');
        header('Location: /' . $target, true, 301);
        exit;
    }
    $status = 0;
}

if ($status === 404) {
    messagePage(404, 'Shop not found', 'There is no shop at this address.', false);
    exit;
}

$data = $status === 200 && $answer !== null ? json_decode($answer['body'], true) : null;
$place = is_array($data) && isset($data['place']) && is_array($data['place']) ? $data['place'] : null;
$npub = $place === null ? '' : field($place, 'id');
if ($place === null || $isHex || !hash_equals($id, $npub)) {
    messagePage(503, 'Shop unavailable', 'The shop could not be loaded right now. Please try again in a moment.', true);
    exit;
}

$name = field($place, 'name');
$name = $name === '' ? 'Shop' : $name;
$description = field($place, 'description');
$street = trim(field($place, 'street') . ' ' . field($place, 'houseNumber'));
$town = trim(field($place, 'postalCode') . ' ' . field($place, 'city'));
$country = field($place, 'country');
$address = implode(', ', array_values(array_filter([$street, $town, $country], static fn ($part) => $part !== '')));
$lat = isset($place['lat']) && (is_float($place['lat']) || is_int($place['lat'])) ? (float) $place['lat'] : null;
$lon = isset($place['lon']) && (is_float($place['lon']) || is_int($place['lon'])) ? (float) $place['lon'] : null;
$hasPosition = $lat !== null && $lon !== null && abs($lat) <= 90 && abs($lon) <= 180;
$photos = [];
foreach (isset($place['photos']) && is_array($place['photos']) ? $place['photos'] : [] as $raw) {
    $photo = photoOf($raw);
    if ($photo !== null && count($photos) < PHOTOS_MAX) {
        $photos[] = $photo;
    }
}
$supports = [];
foreach (isset($place['supports']) && is_array($place['supports']) ? $place['supports'] : [] as $pair) {
    if (count($supports) < SUPPORTS_MAX && is_array($pair) && isset($pair['blockchain'], $pair['asset']) && is_string($pair['blockchain']) && is_string($pair['asset'])) {
        $chain = cut(trim($pair['blockchain']), 100);
        $asset = cut(trim($pair['asset']), 100);
        if ($chain !== '' && $asset !== '') {
            $supports[] = $chain . ' · ' . $asset;
        }
    }
}
$shopType = field($place, 'shopType');
$techProvider = field($place, 'techProvider');
$category = field($place, 'category');
$activity = activityText(field($place, 'activity'));
$canonical = SITE_ORIGIN . '/' . $npub;
$coverPhoto = isset($place['coverPhoto']) ? photoOf($place['coverPhoto']) : null;
$cover = $coverPhoto['url'] ?? $photos[0]['url'] ?? SITE_OG_IMAGE;
$summary = $description !== '' ? $description : ($address !== '' ? $address : 'A shop that accepts OpenCryptoPay.');
if (cut($summary, 301) !== cut($summary, 300)) {
    $summary = cut($summary, 297) . '…';
}
$directions = $hasPosition
    ? 'https://www.openstreetmap.org/directions?route=' . rawurlencode(';' . $lat . ',' . $lon)
    : 'https://www.openstreetmap.org/search?query=' . rawurlencode($address);

$jsonLd = [
    '@context' => 'https://schema.org',
    '@type' => 'LocalBusiness',
    'name' => $name,
    'url' => $canonical,
    'address' => [
        '@type' => 'PostalAddress',
        'streetAddress' => $street,
        'postalCode' => field($place, 'postalCode'),
        'addressLocality' => field($place, 'city'),
        'addressCountry' => $country,
    ],
];
if ($description !== '') {
    $jsonLd['description'] = $description;
}
if ($hasPosition) {
    $jsonLd['geo'] = ['@type' => 'GeoCoordinates', 'latitude' => $lat, 'longitude' => $lon];
}
if ($photos !== []) {
    $jsonLd['image'] = array_map(static fn ($photo) => $photo['url'], $photos);
}

http_response_code(200);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: public, max-age=60');
pageStart(
    $name . ' – Open CryptoPay',
    $summary,
    $cover,
    $canonical,
    '  <script type="application/ld+json">' . js($jsonLd) . "</script>\n"
);
?>
        <article class="ocp-shop">
<?php if ($photos !== []) { ?>
          <div class="ocp-shop-gallery" data-count="<?= h((string) min(count($photos), GALLERY_CELLS)) ?>">
<?php foreach ($photos as $index => $photo) { ?>
            <button type="button" class="ocp-shop-photo"<?= $index >= GALLERY_CELLS ? ' hidden' : '' ?> data-index="<?= h((string) $index) ?>" data-full="<?= h($photo['url']) ?>" data-caption="<?= h($photo['caption']) ?>" aria-label="<?= h('Open photo ' . ($index + 1) . ' of ' . count($photos)) ?>">
              <img src="<?= h($photo['url']) ?>" alt="<?= h($photo['caption'] !== '' ? $photo['caption'] : $name) ?>"<?= $photo['width'] !== null ? ' width="' . h((string) $photo['width']) . '"' : '' ?><?= $photo['height'] !== null ? ' height="' . h((string) $photo['height']) . '"' : '' ?> loading="<?= $index === 0 ? 'eager' : 'lazy' ?>">
<?php if ($index === GALLERY_CELLS - 1 && count($photos) > GALLERY_CELLS) { ?>
              <span class="ocp-shop-more" aria-hidden="true">+<?= h((string) (count($photos) - GALLERY_CELLS)) ?></span>
<?php } ?>
            </button>
<?php } ?>
          </div>
<?php } ?>
          <div class="ocp-shop-body">
            <div class="ocp-shop-main">
              <h1 class="large-title left ocp-shop-name"><?= h($name) ?></h1>
<?php if ($category !== '') { ?>
              <p class="ocp-shop-category"><?= h($category) ?></p>
<?php } ?>
<?php if ($description !== '') { ?>
              <p class="paragraph gray ocp-shop-description"><?= nl2br(h($description), false) ?></p>
<?php } ?>
              <dl class="ocp-shop-facts">
<?php if ($address !== '') { ?>
                <dt>Address</dt>
                <dd><?= h($address) ?> · <a class="ocp-shop-link" href="<?= h($directions) ?>" target="_blank" rel="noopener">Directions</a></dd>
<?php } ?>
<?php if ($shopType !== '') { ?>
                <dt>Shop type</dt>
                <dd><?= h($shopType) ?></dd>
<?php } ?>
<?php if ($techProvider !== '') { ?>
                <dt>Tech provider</dt>
                <dd><?= h($techProvider) ?></dd>
<?php } ?>
                <dt>Accepted</dt>
                <dd><?= $supports === [] ? h('Payment options offered by ' . ($techProvider !== '' ? $techProvider : 'the tech provider')) : h(implode(', ', $supports)) ?></dd>
                <dt>Activity</dt>
                <dd><?= h($activity) ?></dd>
                <dt>NOSTR</dt>
                <dd class="ocp-shop-npub">
                  <code><?= h($npub) ?></code>
                  <button type="button" class="ocp-shop-copy" data-copy="<?= h($npub) ?>">Copy</button>
                  <a class="ocp-shop-link" href="<?= h('https://njump.me/' . $npub) ?>" target="_blank" rel="noopener">Open in NOSTR</a>
                </dd>
              </dl>
              <p><a class="ocp-shop-link" href="/stores.html">All stores</a></p>
            </div>
<?php if ($hasPosition) { ?>
            <div class="ocp-shop-map" id="ocp-shop-map" data-lat="<?= h((string) $lat) ?>" data-lon="<?= h((string) $lon) ?>" role="region" aria-label="Map"></div>
<?php } ?>
          </div>
        </article>
        <div class="ocp-shop-viewer" id="ocp-shop-viewer" role="dialog" aria-modal="true" aria-label="Photos" hidden>
          <button type="button" class="ocp-shop-viewer-close" aria-label="Close">×</button>
          <button type="button" class="ocp-shop-viewer-prev" aria-label="Previous photo">‹</button>
          <figure>
            <img alt="">
            <figcaption></figcaption>
          </figure>
          <button type="button" class="ocp-shop-viewer-next" aria-label="Next photo">›</button>
        </div>
<?php
pageEnd(true);
