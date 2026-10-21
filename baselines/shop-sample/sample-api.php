<?php
// Fixed sample API for the shop page baseline (baselines/website-shop.png).
// Serves one shop whose text holds quotes, tags and </script>, so the
// baseline and the page-source check show that shop.php escapes every value.
// Run with PHP's built-in server; see README.md in this folder.
$port = (int) ($_SERVER['SERVER_PORT'] ?? 8462);
$hex = '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d';
$npub = 'npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6';
$hostile = "\"Quote's\" <b>bold</b> </script><script>alert(1)</script>";
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$photo = static function (string $file, int $width, int $height, ?string $caption) use ($port): array {
    return ['url' => "http://127.0.0.1:{$port}/photos/{$file}", 'width' => $width, 'height' => $height, 'caption' => $caption];
};

if (preg_match('#^/photos/([A-Za-z0-9._-]+)$#', $path, $m) === 1) {
    $file = __DIR__ . '/../../images/' . $m[1];
    if (!is_file($file)) {
        http_response_code(404);
        return true;
    }
    header('Content-Type: ' . (str_ends_with($m[1], '.webp') ? 'image/webp' : 'image/png'));
    readfile($file);
    return true;
}

header('Content-Type: application/json');
if ($path === "/map/places/{$npub}") {
    $set = [
        $photo('og_image-p-1080.png', 1080, 567, "Front {$hostile}"),
        $photo('Logo-CTA-Background-p-800.png', 800, 256, null),
        $photo('Check-out-webshop-Compressify.io-p-800.webp', 800, 450, 'Checkout'),
    ];
    // OCP_SAMPLE_PHOTOS (1 to 10, default 3) repeats the set to show another gallery layout.
    $count = max(1, min(10, (int) (getenv('OCP_SAMPLE_PHOTOS') ?: 3)));
    $photos = [];
    for ($i = 0; $i < $count; $i++) {
        $photos[] = $set[$i % 3];
    }
    echo json_encode(['place' => [
        'id' => $npub,
        'origin' => 'sample',
        'name' => "Café {$hostile}",
        'description' => "Neighbourhood café that accepts Bitcoin.\nSecond line {$hostile}",
        'lat' => 47.3769,
        'lon' => 8.5417,
        'category' => 'cafe',
        'techProvider' => 'DFX.swiss',
        'shopType' => 'Others',
        'shopName' => null,
        'street' => "Bahnhofstrasse {$hostile}",
        'houseNumber' => '1',
        'postalCode' => '8001',
        'city' => 'Zürich',
        'country' => 'CH',
        'supports' => [['blockchain' => 'Bitcoin', 'asset' => 'BTC'], ['blockchain' => 'Lightning', 'asset' => 'BTC']],
        'activity' => 'within7Days',
        'coverPhoto' => ['url' => $photos[0]['url'], 'width' => 1080, 'height' => 567],
        'photos' => $photos,
    ]]);
} elseif ($path === "/map/places/{$hex}") {
    http_response_code(301);
    header("Location: /map/places/{$npub}");
    echo '{}';
} elseif ($path === '/map/places/npub1' . str_repeat('q', 58)) {
    http_response_code(500);
    header('Content-Type: text/plain');
    echo 'broken';
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Place not found']);
}
return true;
