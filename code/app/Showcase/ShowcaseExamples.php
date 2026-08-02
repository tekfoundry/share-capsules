<?php

namespace App\Showcase;

use InvalidArgumentException;

final class ShowcaseExamples
{
    public const OPEN_IMAGE = 'open-image';

    public const TIME_FUTURE = 'time-future';

    public const TIME_OPEN = 'time-open';

    public const TIME_EXPIRED = 'time-expired';

    public const LIMIT = 'limit';

    public const TRUST = 'trust';

    public const REVOKED = 'revoked';

    /**
     * @return array<int, array{slug: string, title: string, image: string, capsule: string, policy: string, expected: string}>
     */
    public static function all(): array
    {
        return [
            self::example(self::OPEN_IMAGE, 'Open Capsule', 'open-image.jpg', 'open-image-r1.capsule', 'open', 'opens normally'),
            self::example(self::TIME_FUTURE, 'Opens Later', 'time-future.jpg', 'time-future-r1.capsule', 'time:not-before', 'locked until the opening time'),
            self::example(self::TIME_OPEN, 'Currently Open', 'time-open.jpg', 'time-open-r1.capsule', 'time:open-window', 'opens during the current window'),
            self::example(self::TIME_EXPIRED, 'Expired', 'time-expired.jpg', 'time-expired-r1.capsule', 'time:not-after', 'locked because the opening window ended'),
            self::example(self::LIMIT, 'Limited Opens', 'limit.jpg', 'limit-r1.capsule', 'limit', 'opens until the configured limit is reached'),
            self::example(self::TRUST, 'Trust Challenge', 'trust.jpg', 'trust-r1.capsule', 'trust', 'opens normally, or asks for a quick human check when trust signals require it'),
            self::example(self::REVOKED, 'Revoked', 'revoked.jpg', 'revoked-r1.capsule', 'revoked', 'locked because access was permanently revoked'),
        ];
    }

    /**
     * @return array{slug: string, title: string, image: string, capsule: string, policy: string, expected: string}
     */
    public static function get(string $slug): array
    {
        foreach (self::all() as $example) {
            if ($example['slug'] === $slug) {
                return $example;
            }
        }

        throw new InvalidArgumentException("Unknown showcase example [{$slug}].");
    }

    public static function imagePath(string $slug): string
    {
        return public_path('showcase/images/'.self::get($slug)['image']);
    }

    public static function imageUrlPath(string $slug): string
    {
        return '/showcase/images/'.self::get($slug)['image'];
    }

    public static function capsulePath(string $slug): string
    {
        return public_path('showcase/capsules/'.self::get($slug)['capsule']);
    }

    public static function capsuleUrlPath(string $slug): string
    {
        return '/showcase/capsules/'.self::get($slug)['capsule'];
    }

    /**
     * @return array{slug: string, title: string, image: string, capsule: string, policy: string, expected: string}
     */
    private static function example(
        string $slug,
        string $title,
        string $image,
        string $capsule,
        string $policy,
        string $expected,
    ): array {
        return [
            'slug' => $slug,
            'title' => $title,
            'image' => $image,
            'capsule' => $capsule,
            'policy' => $policy,
            'expected' => $expected,
        ];
    }
}
