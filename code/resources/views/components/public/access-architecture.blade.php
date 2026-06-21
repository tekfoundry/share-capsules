<figure class="relative mx-auto w-full max-w-xl lg:mx-0 lg:justify-self-end" aria-labelledby="access-architecture-title">
    <div class="absolute -inset-6 -z-10 rounded-[2.5rem] bg-brand/5 blur-2xl" aria-hidden="true"></div>
    <div class="overflow-hidden rounded-[1.75rem] border border-artifact-line bg-artifact text-white shadow-2xl shadow-slate-950/20">
        <div class="flex items-center justify-between border-b border-artifact-line px-5 py-4 sm:px-6">
            <div>
                <p class="text-[0.68rem] font-bold tracking-[0.16em] text-violet-300 uppercase">Access architecture</p>
                <p id="access-architecture-title" class="mt-1 text-sm font-semibold">How an encrypted Capsule becomes viewable</p>
            </div>
            <span class="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[0.65rem] font-bold tracking-wide text-amber-200 uppercase">
                Proposed V1
            </span>
        </div>

        <div class="p-5 sm:p-7">
            <div class="mx-auto flex max-w-xs items-center gap-4 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-4">
                <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-300/10 text-amber-300" aria-hidden="true">
                    <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path d="M7 3.75h7l3 3V20.25H7z" />
                        <path d="M14 3.75v3h3M9.5 12h5M9.5 15.5h5" />
                    </svg>
                </span>
                <div>
                    <p class="text-[0.65rem] font-bold tracking-[0.15em] text-amber-300 uppercase">Capsule</p>
                    <p class="mt-1 text-sm font-semibold">Encrypted content + signed policy</p>
                </div>
            </div>

            <div class="flex flex-col items-center" aria-hidden="true">
                <span class="h-5 w-px bg-artifact-line"></span>
                <span class="text-[0.6rem] font-bold tracking-wider text-slate-400 uppercase">Fetch + verify</span>
                <span class="h-5 w-px bg-artifact-line"></span>
            </div>

            <div class="mx-auto flex max-w-sm items-center gap-4 rounded-xl border border-violet-300/25 bg-violet-300/[0.07] p-4">
                <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-300/10 text-violet-300" aria-hidden="true">
                    <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <rect x="4" y="4" width="16" height="12" rx="2" />
                        <path d="M8 20h8M12 16v4" />
                    </svg>
                </span>
                <div>
                    <p class="text-[0.65rem] font-bold tracking-[0.15em] text-violet-300 uppercase">Trusted Viewer</p>
                    <p class="mt-1 text-sm font-semibold">Reads the policy and coordinates access</p>
                </div>
            </div>

            <div class="mt-5 flex items-center gap-3" aria-label="CTX protocol connections">
                <span class="h-px flex-1 bg-violet-300/25"></span>
                <span class="rounded-full border border-violet-300/30 bg-violet-300/10 px-4 py-1.5 text-xs font-bold tracking-[0.14em] text-violet-200 uppercase">CTX protocol</span>
                <span class="h-px flex-1 bg-violet-300/25"></span>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3">
                <div class="rounded-xl border border-teal-300/20 bg-white/[0.035] p-4 text-center">
                    <span class="mx-auto grid size-9 place-items-center rounded-lg bg-teal-300/10 text-teal-300" aria-hidden="true">
                        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                            <path d="M12 3.5 19 6v5c0 4.5-2.7 7.5-7 9.5C7.7 18.5 5 15.5 5 11V6z" />
                            <path d="m9 12 2 2 4-4" />
                        </svg>
                    </span>
                    <p class="mt-3 text-xs font-bold text-white">Trust Provider</p>
                    <p class="mt-1 text-[0.68rem] leading-5 text-slate-400"><span class="text-teal-300">1.</span> Evaluates the policy</p>
                </div>

                <div class="rounded-xl border border-amber-300/20 bg-white/[0.035] p-4 text-center">
                    <span class="mx-auto grid size-9 place-items-center rounded-lg bg-amber-300/10 text-amber-300" aria-hidden="true">
                        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                            <circle cx="8.5" cy="12" r="3.5" />
                            <path d="M12 12h8M17 12v3M20 12v2" />
                        </svg>
                    </span>
                    <p class="mt-3 text-xs font-bold text-white">Key Broker</p>
                    <p class="mt-1 text-[0.68rem] leading-5 text-slate-400"><span class="text-amber-300">2.</span> Releases a wrapped key</p>
                </div>
            </div>
        </div>

        <figcaption class="border-t border-artifact-line bg-[#091429] px-5 py-4 text-xs leading-5 text-slate-400 sm:px-6">
            The Viewer—not the Host—speaks CTX, receives the device-bound key, and decrypts locally.
        </figcaption>
    </div>
</figure>
