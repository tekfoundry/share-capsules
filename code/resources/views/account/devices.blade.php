@extends('layouts.app')

@section('title', 'Viewer devices — Share Capsules')
@section('description', 'Inspect and manage browser-extension Viewer devices.')

@section('content')
    <section class="mx-auto max-w-5xl px-5 py-16 sm:px-8 lg:px-10">
        <a class="text-sm font-semibold text-brand hover:text-brand-strong" href="{{ route('account.security') }}">← Back to account security</a>

        <div class="mt-6">
            <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Trusted installations</p>
            <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Viewer devices</h1>
            <p class="mt-3 max-w-2xl leading-7 text-muted">Each Viewer installation has separate proof and agreement keys. These keys establish continuity and secure key delivery; they do not prove identity or personhood.</p>
        </div>

        @if (session('status'))
            <div role="status" class="mt-8 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{{ session('status') }}</div>
        @endif

        @error('device')
            <div role="alert" class="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{{ $message }}</div>
        @enderror

        <div class="mt-8 space-y-5">
            @forelse ($devices as $device)
                <article class="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
                    <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                                <h2 class="font-bold text-ink">{{ $device->name }}</h2>
                                <span class="rounded-full px-2 py-0.5 text-xs font-bold {{ $device->status->value === 'active' ? 'bg-teal-50 text-teal-800' : ($device->status->value === 'suspended' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800') }}">{{ ucfirst($device->status->value) }}</span>
                            </div>
                            <p class="mt-2 text-sm text-muted">
                                Registered {{ $device->created_at->diffForHumans() }}
                                @if ($device->last_used_at)
                                    <span aria-hidden="true">·</span> Last used {{ $device->last_used_at->diffForHumans() }}
                                @endif
                            </p>
                            <dl class="mt-4 grid gap-2 text-xs text-muted">
                                <div><dt class="inline font-semibold text-ink">Proof key:</dt> <dd class="inline font-mono">{{ Str::limit($device->proof_jkt, 22) }}</dd></div>
                                <div><dt class="inline font-semibold text-ink">Agreement key:</dt> <dd class="inline font-mono">{{ Str::limit($device->agreement_jkt, 22) }}</dd></div>
                            </dl>
                        </div>

                        @if ($device->status->value !== 'revoked')
                            <div class="flex flex-wrap gap-2">
                                @if ($device->status->value === 'active')
                                    <form method="POST" action="{{ route('account.devices.suspend', $device) }}">
                                        @csrf
                                        <button class="inline-flex min-h-10 items-center justify-center rounded-xl border border-amber-200 px-4 text-sm font-semibold text-amber-800 hover:bg-amber-50" type="submit">Suspend</button>
                                    </form>
                                @else
                                    <form method="POST" action="{{ route('account.devices.activate', $device) }}">
                                        @csrf
                                        <button class="inline-flex min-h-10 items-center justify-center rounded-xl border border-teal-200 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50" type="submit">Activate</button>
                                    </form>
                                @endif
                                <form method="POST" action="{{ route('account.devices.destroy', $device) }}">
                                    @csrf
                                    @method('DELETE')
                                    <button class="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50" type="submit">Revoke</button>
                                </form>
                            </div>
                        @endif
                    </div>

                    @if ($device->status->value !== 'revoked')
                        <form class="mt-5 flex max-w-xl flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-end" method="POST" action="{{ route('account.devices.update', $device) }}">
                            @csrf
                            @method('PATCH')
                            <div class="flex-1">
                                <x-forms.input label="Device name" name="name" value="{{ $device->name }}" maxlength="80" required />
                            </div>
                            <button class="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-brand shadow-sm hover:border-brand/30" type="submit">Save name</button>
                        </form>
                    @endif
                </article>
            @empty
                <div class="rounded-2xl border border-line bg-white p-6 text-sm leading-6 text-muted shadow-card">No Viewer devices are registered. A supported extension will appear here after you approve its connection and it proves possession of both device keys.</div>
            @endforelse
        </div>
    </section>
@endsection
