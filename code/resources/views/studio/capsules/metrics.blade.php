@extends('layouts.account')
@section('title', 'Capsule metrics — Share Capsules')
@php
    $denialDescriptions = [
        'eligibility' => 'Viewer account, email, or device requirements were not satisfied.',
        'consent' => 'The viewer did not approve the access check required for this opening.',
        'limit' => 'A total or per-viewer opening limit has been reached.',
        'risk' => 'A viewer trust check was needed or current automation risk was too high.',
        'policy' => 'The signed policy could not be satisfied, such as an access window mismatch or unsupported rule.',
        'ticket' => 'The authorization ticket was invalid, expired, replayed, or failed proof checks.',
        'availability' => 'A required provider, broker, scoring, or release service was temporarily unavailable.',
    ];
@endphp
@section('account-content')
<section>
    <a class="text-sm font-semibold text-brand" href="{{ route('studio.capsules.index') }}">← Back to your Capsules</a>
    <h1 class="mt-6 text-3xl font-semibold">Capsule metrics</h1>
    <p class="mt-2 break-all text-sm text-muted">{{ $capsuleId }} · revision {{ $revision }}</p>
    <div class="mt-8 grid gap-4 sm:grid-cols-3">
        <div class="rounded-2xl border border-line bg-white p-5"><p class="text-sm text-muted">Completed openings</p><p class="mt-2 text-3xl font-bold">{{ number_format($committed) }}</p></div>
        <div class="rounded-2xl border border-line bg-white p-5"><p class="text-sm text-muted">Authorization requests</p><p class="mt-2 text-3xl font-bold">{{ number_format($projection?->authorization_attempts ?? 0) }}</p></div>
        <div class="rounded-2xl border border-line bg-white p-5"><p class="text-sm text-muted">Denied requests</p><p class="mt-2 text-3xl font-bold">{{ number_format($projection?->authorization_denied ?? 0) }}</p></div>
    </div>
    <section class="mt-6 rounded-2xl border border-line bg-white p-6">
        <h2 class="text-xl font-bold">Total opening limit</h2>
        <p class="mt-2 text-muted">{{ $capsuleLimit === null ? 'No total limit is available in current operational records.' : number_format($committed).' of '.number_format($capsuleLimit).' openings used.' }}</p>
    </section>
    <section class="mt-6 rounded-2xl border border-line bg-white p-6">
        <h2 class="text-xl font-bold">Per-user limit pressure</h2>
        <p class="mt-2 text-muted">{{ $pressure === null ? 'Unavailable while we complete the privacy review for this metric.' : number_format($pressure).' of '.number_format($accountCohort).' accounts are nearing their opening limit.' }}</p>
        <p class="mt-2 text-sm text-muted">Only a cohort count is shown. User identifiers and individual histories are never included.</p>
    </section>
    <section class="mt-6 rounded-2xl border border-line bg-white p-6">
        <h2 class="text-xl font-bold">Recent hourly activity</h2>
        <div class="mt-4 overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr><th class="p-2">Hour</th><th class="p-2">Requests</th><th class="p-2">Approved</th><th class="p-2">Denied</th><th class="p-2">Opened</th></tr></thead><tbody>@forelse($buckets as $bucket)<tr class="border-t border-line"><td class="p-2">{{ $bucket->bucket_start->toIso8601String() }}</td><td class="p-2">{{ $bucket->authorization_attempts }}</td><td class="p-2">{{ $bucket->authorization_approved }}</td><td class="p-2">{{ $bucket->authorization_denied }}</td><td class="p-2">{{ $bucket->redemption_committed }}</td></tr>@empty<tr><td class="p-2 text-muted" colspan="5">No activity recorded yet.</td></tr>@endforelse</tbody></table></div>
    </section>
    <section class="mt-6 rounded-2xl border border-line bg-white p-6">
        <h2 class="text-xl font-bold">Safe denial groups</h2>
        <p class="mt-2 text-sm leading-6 text-muted">These are reviewed aggregate categories. They do not include viewer identifiers, raw trust scores, challenge details, tickets, proofs, or individual histories.</p>
        <ul class="mt-4 space-y-3">
            @forelse($denials as $denial)
                <li class="rounded-xl bg-surface p-4">
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p class="font-bold text-ink">{{ str($denial->category)->replace('_', ' ')->headline() }}</p>
                            <p class="mt-1 text-sm leading-6 text-muted">{{ $denialDescriptions[$denial->category] ?? 'A safe reviewed denial category was recorded for this Capsule.' }}</p>
                        </div>
                        <p class="shrink-0 text-lg font-bold text-ink">{{ number_format($denial->occurrences) }}</p>
                    </div>
                </li>
            @empty
                <li class="text-muted">No denied requests recorded.</li>
            @endforelse
        </ul>
    </section>
    <p class="mt-6 text-sm leading-6 text-muted">Fresh through: {{ $projection?->fresh_through?->toIso8601String() ?? 'no events yet' }}. Metrics are operational aggregates, may lag live activity, and follow the documented 30-day detailed-event retention boundary. Sparse per-user breakdowns are suppressed.</p>
</section>
@endsection
