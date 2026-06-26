@extends('layouts.account')

@section('title', 'Your Capsules — Share Capsules')
@section('description', 'Inspect and manage your registered Capsules.')

@section('account-content')
    <div class="space-y-6">
        <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p class="text-sm font-semibold text-brand">Creator Studio</p>
                <h1 class="mt-2 text-3xl font-bold text-ink">Your Capsules</h1>
                <p class="mt-3 max-w-3xl text-muted">This inventory lists Capsule revisions whose content keys were successfully registered. Share Capsules stores identifiers and operational records below—not your original file or decrypted content.</p>
            </div>
            <a class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm hover:bg-brand-strong" href="{{ route('studio.capsules.create') }}">New Capsule</a>
        </header>

        @if (session('status'))
            <p class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">{{ session('status') }}</p>
        @endif

        <section class="overflow-hidden rounded-2xl border border-line bg-white shadow-sm" aria-labelledby="capsule-inventory-heading">
            <div class="flex flex-col gap-2 border-b border-line p-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 id="capsule-inventory-heading" class="text-xl font-bold text-ink">Registered Capsules</h2>
                    <p class="mt-1 text-sm leading-6 text-muted">Policy icons are privacy-safe summaries of the signed access rules. Viewer trust scores and raw evidence are never shown here.</p>
                </div>
                <p class="text-sm font-semibold text-muted">{{ number_format($capsules->total()) }} total</p>
            </div>

            @if ($capsules->isNotEmpty())
                <div class="overflow-x-auto">
                    <table class="w-full table-auto text-left text-sm">
                        <thead class="bg-surface text-xs font-bold tracking-[0.12em] text-muted uppercase">
                            <tr>
                                <th scope="col" class="px-4 py-3">Capsule</th>
                                <th scope="col" class="w-px whitespace-nowrap px-3 py-3">Status</th>
                                <th scope="col" class="w-px whitespace-nowrap px-3 py-3">Policies</th>
                                <th scope="col" class="w-px whitespace-nowrap px-3 py-3 text-right">Openings</th>
                                <th scope="col" class="w-px whitespace-nowrap px-3 py-3">Registered</th>
                                <th scope="col" class="w-px whitespace-nowrap px-3 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-line">
                            @foreach ($capsules as $capsule)
                                <tr class="align-top">
                                    <td class="px-4 py-4">
                                        <a class="font-bold text-ink hover:text-brand" href="{{ route('studio.capsules.metrics', ['capsuleId' => $capsule['capsule_id'], 'revision' => $capsule['capsule_revision']]) }}">{{ $capsule['display_name'] }}</a>
                                        <p class="mt-1 text-xs leading-5 text-muted">
                                            {{ $capsule['content_type'] }}{{ $capsule['media_format'] === null ? '' : ' · '.$capsule['media_format'] }} · Revision {{ $capsule['capsule_revision'] }}
                                        </p>
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-4">
                                        <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase {{ $capsule['status'] === 'active' ? 'bg-emerald-50 text-emerald-700' : ($capsule['status'] === 'revocation_pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700') }}">
                                            {{ str($capsule['status'])->replace('_', ' ') }}
                                        </span>
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-4">
                                        <div class="flex items-center gap-1">
                                            @foreach ($capsule['policy_badges'] as $badge)
                                                @php
                                                    $description = $capsule['policy_descriptions'][$badge] ?? $badge.' policy';
                                                @endphp
                                                <span class="group relative inline-flex items-center justify-center" tabindex="0" aria-label="{{ $description }}">
                                                    @if ($badge === 'Time')
                                                        <x-public.icons.time-capsule class="block" style="width: 2rem; height: 2rem;" />
                                                    @elseif ($badge === 'Limit')
                                                        <x-public.icons.limit-capsule class="block" style="width: 2rem; height: 2rem;" />
                                                    @elseif ($badge === 'Trust')
                                                        <x-public.icons.trust-capsule class="block" style="width: 2rem; height: 2rem;" />
                                                    @endif
                                                    <span class="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-64 -translate-x-1/2 whitespace-normal break-words rounded-lg border border-line bg-ink px-3 py-2 text-left text-xs leading-5 text-white shadow-lg group-hover:block group-focus:block">
                                                        {{ $description }}
                                                    </span>
                                                </span>
                                            @endforeach
                                        </div>
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-4 text-right font-bold text-ink">{{ number_format($capsule['committed_releases']) }}</td>
                                    <td class="whitespace-nowrap px-3 py-4 text-muted">{{ $capsule['registered_at'] ?? 'Unavailable' }}</td>
                                    <td class="px-3 py-4 text-right">
                                        <details class="group relative inline-block" data-disclosure-popover>
                                            <summary class="inline-flex min-h-9 min-w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-line px-2 text-ink hover:border-brand/30 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden" aria-label="Manage Capsule">
                                                <svg aria-hidden="true" class="size-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M5 8l5 5 5-5" />
                                                </svg>
                                            </summary>
                                            <div class="absolute right-0 z-10 mt-2 w-[min(24rem,calc(100vw-4rem))] whitespace-normal break-words rounded-xl border border-line bg-white p-4 text-left shadow-lg">
                                                <p class="font-semibold text-ink">Manage Capsule</p>
                                                <p class="mt-1 text-xs leading-5 text-muted">These actions change account management or key release state. The signed Capsule file is unchanged unless access is revoked or deleted.</p>

                                                <form class="mt-4 grid gap-3" method="POST" action="{{ route('studio.capsules.label', ['capsuleId' => $capsule['capsule_id'], 'revision' => $capsule['capsule_revision']]) }}">
                                                    @csrf
                                                    @method('PATCH')
                                                    <label class="text-xs font-bold tracking-wide text-muted uppercase" for="management-label-{{ $loop->index }}">Name shown in your account</label>
                                                    <input id="management-label-{{ $loop->index }}" class="min-h-11 rounded-xl border border-line px-3 text-ink" name="management_label" maxlength="200" value="{{ $capsule['management_label'] ?? '' }}" placeholder="{{ $capsule['title'] ?? 'Enter a recognizable name' }}">
                                                    <button class="min-h-11 rounded-xl bg-brand px-4 font-bold text-white" type="submit">Update Name</button>
                                                </form>

                                                @if ($capsule['status'] === 'active')
                                                    <form class="mt-4 border-t border-line pt-4" method="POST" action="{{ route('studio.capsules.revoke') }}" data-confirm data-confirm-title="Permanently revoke access?" data-confirm-message="This Capsule will stop opening immediately. Revocation cannot be undone, but the Capsule will remain in your account." data-confirm-action="Revoke access">
                                                        @csrf
                                                        <input type="hidden" name="capsule_id" value="{{ $capsule['capsule_id'] }}">
                                                        <input type="hidden" name="capsule_revision" value="{{ $capsule['capsule_revision'] }}">
                                                        <p class="mb-3 text-xs leading-5 text-muted">Revocation is permanent. The encrypted file may remain online, but its key will never be released again.</p>
                                                        <button class="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50" type="submit">Permanently revoke access</button>
                                                    </form>
                                                @endif

                                                <form class="mt-4 border-t border-line pt-4" method="POST" action="{{ route('studio.capsules.destroy', ['capsuleId' => $capsule['capsule_id'], 'revision' => $capsule['capsule_revision']]) }}" data-confirm data-confirm-title="Delete this Capsule?" data-confirm-message="Its content key will be permanently destroyed and the Capsule will be removed from your account. Downloaded or hosted copies will no longer open." data-confirm-action="Delete Capsule">
                                                    @csrf
                                                    @method('DELETE')
                                                    <p class="mb-3 text-xs leading-5 text-muted">Deleting permanently destroys the content key and removes this Capsule from your account.</p>
                                                    <button class="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800" type="submit">Delete Capsule</button>
                                                </form>
                                            </div>
                                        </details>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>

                <div class="border-t border-line px-5 py-4">
                    {{ $capsules->links() }}
                </div>
            @else
                <div class="p-10 text-center">
                    <h2 class="text-xl font-bold text-ink">No registered Capsules yet</h2>
                    <p class="mt-2 text-muted">A Capsule appears here after its content key is successfully registered.</p>
                    <a class="mt-5 inline-flex rounded-xl bg-brand px-5 py-3 font-bold text-white" href="{{ route('studio.capsules.create') }}">Create a Capsule</a>
                </div>
            @endif
        </section>
    </div>
@endsection
