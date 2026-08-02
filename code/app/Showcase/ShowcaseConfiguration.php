<?php

namespace App\Showcase;

use InvalidArgumentException;

final readonly class ShowcaseConfiguration
{
    public function __construct(
        public bool $generationEnabled,
        public string $ownerEmail,
        public string $ownerName,
        public bool $ownerVerified,
        public bool $interactiveLogin,
        public string $publicRoot,
        public string $imagesPath,
        public string $capsulesPath,
        public string $signingStrategy,
        public string $signingIdentityLabel,
        public bool $persistentSecretConfigured,
        public bool $overwriteExistingCapsules,
        public int $defaultRevision,
    ) {
        if ($this->ownerEmail === '' || ! str_contains($this->ownerEmail, '@')) {
            throw new InvalidArgumentException('Showcase owner email must be configured.');
        }
        if ($this->ownerName === '') {
            throw new InvalidArgumentException('Showcase owner name must be configured.');
        }
        if ($this->interactiveLogin) {
            throw new InvalidArgumentException('Showcase owner must not be configured for interactive login.');
        }
        if ($this->signingStrategy !== 'fresh-per-generation') {
            throw new InvalidArgumentException('Unsupported showcase signing strategy.');
        }
        if ($this->persistentSecretConfigured) {
            throw new InvalidArgumentException('Persistent showcase signing secrets are not supported yet.');
        }
        if ($this->defaultRevision < 1) {
            throw new InvalidArgumentException('Showcase default revision must be positive.');
        }
        foreach ([$this->publicRoot, $this->imagesPath, $this->capsulesPath] as $path) {
            if ($path === '' || str_starts_with($path, '/') || str_contains($path, '..')) {
                throw new InvalidArgumentException('Showcase public paths must be relative public paths.');
            }
        }
    }

    public static function fromConfig(): self
    {
        /** @var array{
         *     owner: array{email: string, name: string, verified: bool, interactive_login: bool},
         *     assets: array{public_root: string, images_path: string, capsules_path: string},
         *     signing: array{strategy: string, identity_label: string, persistent_secret_configured: bool},
         *     generation: array{enabled: bool, overwrite_existing_capsules: bool, default_revision: int}
         * } $config
         */
        $config = config('showcase');

        return new self(
            generationEnabled: (bool) $config['generation']['enabled'],
            ownerEmail: trim((string) $config['owner']['email']),
            ownerName: trim((string) $config['owner']['name']),
            ownerVerified: (bool) $config['owner']['verified'],
            interactiveLogin: (bool) $config['owner']['interactive_login'],
            publicRoot: trim((string) $config['assets']['public_root']),
            imagesPath: trim((string) $config['assets']['images_path']),
            capsulesPath: trim((string) $config['assets']['capsules_path']),
            signingStrategy: trim((string) $config['signing']['strategy']),
            signingIdentityLabel: trim((string) $config['signing']['identity_label']),
            persistentSecretConfigured: (bool) $config['signing']['persistent_secret_configured'],
            overwriteExistingCapsules: (bool) $config['generation']['overwrite_existing_capsules'],
            defaultRevision: (int) $config['generation']['default_revision'],
        );
    }
}
