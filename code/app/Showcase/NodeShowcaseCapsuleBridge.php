<?php

namespace App\Showcase;

use JsonException;
use Symfony\Component\Process\Process;

final readonly class NodeShowcaseCapsuleBridge implements ShowcaseCapsuleBridge
{
    public function __construct(
        private string $nodeBinary = 'node',
        private string $scriptPath = '',
        private int $timeoutSeconds = 30,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            nodeBinary: (string) config('showcase.bridge.node_binary', 'node'),
            scriptPath: base_path((string) config('showcase.bridge.script_path', 'scripts/showcase-capsule-bridge.mjs')),
            timeoutSeconds: (int) config('showcase.bridge.timeout_seconds', 30),
        );
    }

    public function prepare(ShowcaseCapsulePrepareInput $input): ShowcaseCapsulePrepareResult
    {
        return ShowcaseCapsulePrepareResult::fromPayload($this->run([
            'command' => 'prepare',
            'slug' => $input->slug,
            'title' => $input->title,
            'description' => $input->description,
            'draft_policy' => $input->draftPolicy,
            'source_path' => $input->sourcePath,
            'state_path' => $input->statePath,
            'content_key_path' => $input->contentKeyPath,
            'ctx_issuer' => $input->ctxIssuer,
            'automation_risk_issuer' => $input->automationRiskIssuer,
        ]));
    }

    public function complete(ShowcaseCapsuleCompleteInput $input): ShowcaseCapsuleCompleteResult
    {
        return ShowcaseCapsuleCompleteResult::fromPayload($this->run([
            'command' => 'complete',
            'state_path' => $input->statePath,
            'archive_path' => $input->archivePath,
            'release_handle' => $input->releaseHandle,
            'broker' => $input->broker,
        ]));
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function run(array $payload): array
    {
        $scriptPath = $this->scriptPath !== '' ? $this->scriptPath : base_path('scripts/showcase-capsule-bridge.mjs');
        $process = new Process([$this->nodeBinary, $scriptPath], base_path());
        $process->setTimeout($this->timeoutSeconds);
        try {
            $process->setInput(json_encode($payload, JSON_THROW_ON_ERROR));
        } catch (JsonException $exception) {
            throw new ShowcaseGenerationFailed('Showcase bridge input could not be encoded.', previous: $exception);
        }

        $process->run();
        if (! $process->isSuccessful()) {
            $detail = trim($process->getErrorOutput()) ?: 'unknown bridge failure';
            throw new ShowcaseGenerationFailed("Showcase bridge failed: {$detail}");
        }

        try {
            $decoded = json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new ShowcaseGenerationFailed('Showcase bridge returned invalid JSON.', previous: $exception);
        }
        if (! is_array($decoded)) {
            throw new ShowcaseGenerationFailed('Showcase bridge returned a non-object response.');
        }

        /** @var array<string, mixed> $decoded */
        return $decoded;
    }
}
