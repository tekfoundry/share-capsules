<?php

declare(strict_types=1);

const WIDTH = 1200;
const HEIGHT = 630;

function fontPath(bool $bold = false): string
{
    $paths = $bold
        ? [
            '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        ]
        : [
            '/System/Library/Fonts/Supplemental/Arial.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        ];

    foreach ($paths as $path) {
        if (is_file($path)) {
            return $path;
        }
    }

    throw new RuntimeException('A supported TrueType font is required to generate the social card.');
}

/** @param array{0: int, 1: int, 2: int} $rgb */
function color(GdImage $image, array $rgb): int
{
    return imagecolorallocate($image, $rgb[0], $rgb[1], $rgb[2]);
}

function roundedRectangle(GdImage $image, int $x1, int $y1, int $x2, int $y2, int $radius, int $color): void
{
    imagefilledrectangle($image, $x1 + $radius, $y1, $x2 - $radius, $y2, $color);
    imagefilledrectangle($image, $x1, $y1 + $radius, $x2, $y2 - $radius, $color);
    imagefilledellipse($image, $x1 + $radius, $y1 + $radius, $radius * 2, $radius * 2, $color);
    imagefilledellipse($image, $x2 - $radius, $y1 + $radius, $radius * 2, $radius * 2, $color);
    imagefilledellipse($image, $x1 + $radius, $y2 - $radius, $radius * 2, $radius * 2, $color);
    imagefilledellipse($image, $x2 - $radius, $y2 - $radius, $radius * 2, $radius * 2, $color);
}

function text(GdImage $image, int $size, int $x, int $baseline, int $color, string $font, string $value): void
{
    imagettftext($image, $size, 0, $x, $baseline, $color, $font, $value);
}

$image = imagecreatetruecolor(WIDTH, HEIGHT);
imageantialias($image, true);

$canvas = color($image, [246, 248, 252]);
$glow = color($image, [228, 238, 251]);
$ink = color($image, [16, 28, 53]);
$muted = color($image, [95, 108, 130]);
$brand = color($image, [23, 105, 194]);
$teal = color($image, [20, 184, 166]);
$artifact = color($image, [11, 23, 48]);
$artifactSurface = color($image, [19, 37, 65]);
$artifactLine = color($image, [51, 72, 111]);
$violet = color($image, [196, 181, 253]);
$amber = color($image, [253, 186, 116]);
$white = color($image, [255, 255, 255]);
$shadow = color($image, [219, 226, 236]);

imagefill($image, 0, 0, $canvas);
imagefilledellipse($image, 1100, -20, 720, 720, $glow);

$regular = fontPath();
$bold = fontPath(true);

roundedRectangle($image, 74, 64, 132, 122, 17, $brand);
imagesetthickness($image, 4);
imageline($image, 96, 83, 96, 106, $white);
imageline($image, 96, 83, 113, 83, $white);
imageline($image, 96, 106, 113, 106, $white);
imageline($image, 113, 83, 113, 91, $white);
imageline($image, 113, 98, 113, 106, $white);
text($image, 18, 152, 87, $ink, $bold, 'SHARE');
text($image, 18, 152, 116, $ink, $bold, 'CAPSULES');

text($image, 40, 74, 210, $ink, $bold, 'Share your work');
text($image, 40, 74, 267, $ink, $bold, 'with people.');
text($image, 37, 74, 335, $brand, $bold, 'Not with every machine');
text($image, 37, 74, 388, $brand, $bold, 'that asks.');
text($image, 17, 74, 436, $muted, $regular, 'Creator-controlled encrypted content with explicit trust policies.');

roundedRectangle($image, 862, 194, 1122, 480, 34, $shadow);
roundedRectangle($image, 850, 176, 1110, 462, 34, $artifact);
roundedRectangle($image, 910, 224, 1050, 399, 26, $artifactSurface);
imagesetthickness($image, 3);
imageline($image, 1012, 224, 1050, 262, $amber);
imageline($image, 1012, 224, 1012, 262, $amber);
imageline($image, 1012, 262, 1050, 262, $amber);

roundedRectangle($image, 938, 285, 1022, 353, 15, $brand);
imagesetthickness($image, 4);
imagerectangle($image, 954, 313, 1006, 345, $violet);
imagearc($image, 980, 313, 38, 38, 180, 360, $violet);
imagefilledellipse($image, 980, 329, 7, 7, $violet);
text($image, 13, 914, 431, $violet, $bold, 'CAPSULE + CTX');

imagefilledellipse($image, 81, 548, 14, 14, $teal);
text($image, 16, 99, 555, $muted, $bold, 'OPEN EXPERIMENTAL ARCHITECTURE');
text($image, 17, 946, 555, $brand, $bold, 'sharecapsules.com');

$output = dirname(__DIR__).'/public/images/share-capsules-social.png';
if (! is_dir(dirname($output))) {
    mkdir(dirname($output), 0775, true);
}

imagepng($image, $output, 9);
imagedestroy($image);

fwrite(STDOUT, "Generated {$output}\n");
