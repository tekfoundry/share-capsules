@props(['id' => 'access-workflow'])

<figure {{ $attributes->merge(['id' => $id, 'class' => 'scroll-mt-6 overflow-hidden rounded-[1.75rem] border border-artifact-line bg-artifact text-white shadow-2xl shadow-slate-950/15']) }}>
    <figcaption class="border-b border-artifact-line px-5 py-6 sm:px-7">
        <p class="text-xs font-bold tracking-[0.16em] text-violet-300 uppercase">Creator to Viewer</p>
        <div class="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <h3 class="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Protected content moves. Control stays visible.</h3>
            <p class="max-w-xl text-sm leading-6 text-slate-300">The Host distributes an encrypted file. CTX evaluates access. The Key Broker releases only to an authorized device. The Viewer decrypts locally.</p>
        </div>
    </figcaption>

    <ol class="grid md:grid-cols-3 xl:grid-cols-6" aria-label="Share Capsules access workflow">
        @foreach ([
            ['01', 'Creator tool', 'Encrypt + sign', 'Creates a Capsule locally from the original work.', 'Creator controlled'],
            ['02', 'Compatible Host', 'Serve ciphertext', 'Publishes the opaque Capsule file at an ordinary URL.', 'Public distribution'],
            ['03', 'Trusted Viewer', 'Fetch + verify', 'Reads the signed policy and asks before disclosing evidence.', 'Viewer controlled'],
            ['04', 'CTX Provider', 'Evaluate policy', 'Checks the creator’s conditions using consented evidence.', 'Trust decision'],
            ['05', 'Key Broker', 'Release to device', 'Validates authorization and wraps the content key to the Viewer.', 'Key boundary'],
            ['06', 'Trusted Viewer', 'Decrypt + render', 'Opens the content only inside the isolated Viewer surface.', 'Plaintext boundary'],
        ] as $step)
            <li class="group relative border-b border-artifact-line p-5 md:border-r md:[&:nth-child(3n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(3n)]:border-r xl:last:border-r-0 sm:p-6">
                <div class="flex items-center justify-between gap-3">
                    <span class="text-xs font-bold tracking-[0.14em] text-violet-300 uppercase">{{ $step[0] }}</span>
                    <span class="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[0.62rem] font-semibold tracking-wide text-slate-300 uppercase">{{ $step[4] }}</span>
                </div>
                <p class="mt-6 text-xs font-bold tracking-[0.12em] text-amber-300 uppercase">{{ $step[1] }}</p>
                <h4 class="mt-2 text-base font-bold text-white">{{ $step[2] }}</h4>
                <p class="mt-3 text-sm leading-6 text-slate-300">{{ $step[3] }}</p>
                @unless ($loop->last)
                    <span class="absolute top-1/2 -right-3 z-10 hidden size-6 -translate-y-1/2 place-items-center rounded-full border border-artifact-line bg-[#152442] text-xs text-teal-300 xl:grid" aria-hidden="true">→</span>
                @endunless
            </li>
        @endforeach
    </ol>

    <div class="grid border-t border-artifact-line bg-[#091429] text-xs leading-5 text-slate-300 sm:grid-cols-3">
        <p class="border-b border-artifact-line px-5 py-4 sm:border-r sm:border-b-0"><strong class="text-white">Host:</strong> stores and serves encrypted bytes.</p>
        <p class="border-b border-artifact-line px-5 py-4 sm:border-r sm:border-b-0"><strong class="text-white">Provider:</strong> returns a limited policy decision.</p>
        <p class="px-5 py-4"><strong class="text-white">Viewer:</strong> receives the key and protects plaintext.</p>
    </div>
</figure>
