@extends('layouts.account')

@section('title', 'Create a Capsule — Share Capsules')
@section('description', 'Prepare descriptive metadata and access rules before creating a Capsule locally with the Share Capsules extension.')

@section('account-content')
    <section>
        <div class="max-w-3xl">
            <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Creator Studio</p>
            <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Create a protected Capsule</h1>
            <p class="mt-4 text-lg leading-8 text-muted">Prepare the public description and access rules here. The extension handles your source image, keys, encryption, signature, and final <code>.capsule</code> file locally.</p>
        </div>

        <section aria-labelledby="supported-files-heading" class="mt-8 rounded-2xl border border-brand/20 bg-blue-50/70 p-5 sm:p-6">
            <h2 id="supported-files-heading" class="font-semibold text-ink">Supported files</h2>
            <div class="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div class="rounded-xl bg-white/70 p-4">
                    <p class="font-semibold text-ink">File types</p>
                    <p class="mt-1 text-muted">JPEG, PNG, or WebP image</p>
                </div>
                <div class="rounded-xl bg-white/70 p-4">
                    <p class="font-semibold text-ink">Maximum file size</p>
                    <p class="mt-1 text-muted">About 26 MB</p>
                </div>
            </div>
            <p class="mt-4 text-sm leading-6 text-muted">Additional file types are planned.</p>

            <details class="mt-4 border-t border-brand/15 pt-4 text-sm text-muted">
                <summary class="cursor-pointer font-semibold text-brand hover:text-brand-strong">Image compatibility details</summary>
                <div class="mt-3 space-y-2 leading-6">
                    <p>Images must be static. Animated images, SVG, GIF, and unrecognized files are not supported.</p>
                    <p>The exact file-size limit is 25 MiB (26,214,400 bytes). Images are also limited to 16,384 pixels in either direction and 40 million total pixels to prevent unsafe memory use.</p>
                </div>
            </details>
        </section>

        <div class="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div data-capsule-creator-draft data-capsule-account-label="{{ auth()->user()?->email }}" class="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
                <section aria-labelledby="capsule-description-heading">
                    <p class="text-xs font-bold tracking-[0.14em] text-brand uppercase">Step 1</p>
                    <h2 id="capsule-description-heading" class="mt-2 text-xl font-semibold text-ink">Describe the protected work</h2>
                    <p class="mt-2 text-sm leading-6 text-muted">This descriptive metadata becomes part of the creator-signed manifest. Do not include private information.</p>

                    <div class="mt-6 grid gap-5">
                        <div>
                            <label for="capsule-title" class="text-sm font-semibold text-ink">Title</label>
                            <input id="capsule-title" name="title" type="text" maxlength="200" required autocomplete="off" class="mt-2 min-h-12 w-full rounded-xl border border-line bg-white px-4 text-ink shadow-sm focus:border-brand focus:outline-none" aria-describedby="capsule-title-help">
                            <p id="capsule-title-help" class="mt-2 text-xs leading-5 text-muted">A clear public name for this Capsule.</p>
                        </div>

                        <div>
                            <label for="capsule-description" class="text-sm font-semibold text-ink">Description <span class="font-normal text-muted">(optional)</span></label>
                            <textarea id="capsule-description" name="description" maxlength="1000" rows="4" class="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-ink shadow-sm focus:border-brand focus:outline-none" aria-describedby="capsule-description-help"></textarea>
                            <p id="capsule-description-help" class="mt-2 text-xs leading-5 text-muted">Describe what the protected image shows. This public text may appear with the Capsule and will help screen readers when the image is unavailable. If left blank, the title will be used instead.</p>
                        </div>
                    </div>
                </section>

                <section aria-labelledby="capsule-policy-heading" class="mt-10 border-t border-line pt-8">
                    <p class="text-xs font-bold tracking-[0.14em] text-brand uppercase">Step 2</p>
                    <h2 id="capsule-policy-heading" class="mt-2 text-xl font-semibold text-ink">Choose access limits</h2>
                    <p class="mt-2 text-sm leading-6 text-muted">A viewer must have an active account, a verified email address, and a connected Share Capsules extension. They must also agree that each approved opening will be counted. You can add the optional restrictions below.</p>

                    <div class="mt-6 space-y-4">
                        <div class="rounded-xl border border-line p-4">
                            <h3 class="font-semibold text-ink">Choose when it can be opened <span class="font-normal text-muted">(optional)</span></h3>
                            <p class="mt-1 text-sm leading-6 text-muted">Leave both dates blank to allow access at any time. Dates use your current time zone: <span data-capsule-time-zone class="font-semibold text-ink">local time</span>.</p>
                            <div class="mt-4 grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label for="capsule-access-from" class="text-sm font-semibold text-ink">Can open starting</label>
                                    <input id="capsule-access-from" name="access_from_date" type="date" min="0001-01-01" max="9999-12-31" class="mt-2 min-h-12 w-full rounded-xl border border-line bg-white px-4 text-ink shadow-sm focus:border-brand focus:outline-none">
                                    <p class="mt-2 text-xs leading-5 text-muted">Access begins at midnight at the start of this date.</p>
                                </div>
                                <div>
                                    <label for="capsule-access-through" class="text-sm font-semibold text-ink">Can open through</label>
                                    <input id="capsule-access-through" name="access_through_date" type="date" min="0001-01-01" max="9999-12-30" class="mt-2 min-h-12 w-full rounded-xl border border-line bg-white px-4 text-ink shadow-sm focus:border-brand focus:outline-none">
                                    <p class="mt-2 text-xs leading-5 text-muted">Access remains available for this entire date, then closes at midnight.</p>
                                </div>
                            </div>
                            <p class="mt-4 text-sm leading-6 text-muted">You may provide only a starting date or only a closing date. If both are supplied, the closing date cannot be before the starting date.</p>
                        </div>

                        <div class="rounded-xl border border-line p-4">
                            <h3 class="font-semibold text-ink">Limit how many times this Capsule can be opened <span class="font-normal text-muted">(optional)</span></h3>
                            <p class="mt-1 text-sm leading-6 text-muted">In normal use, the count increases by one each time this Capsule is opened. If you set both limits, the same opening increases both counts. Leave a field blank for no limit at that level; <code>0</code> does not mean unlimited.</p>

                            <div class="mt-5 grid gap-5 md:grid-cols-2">
                                <div class="rounded-xl bg-surface p-4">
                                    <label for="capsule-global-limit" class="font-semibold text-ink">Across all viewer accounts</label>
                                    <p class="mt-1 text-sm leading-6 text-muted">The maximum number of times the Capsule can be opened.</p>
                                    <input id="capsule-global-limit" name="global_limit" type="number" min="1" max="9007199254740991" step="1" inputmode="numeric" placeholder="No total limit" class="mt-4 min-h-12 w-full rounded-xl border border-line bg-white px-4 text-ink shadow-sm focus:border-brand focus:outline-none">
                                </div>

                                <div class="rounded-xl bg-surface p-4">
                                    <label for="capsule-account-limit" class="font-semibold text-ink">For each viewer account</label>
                                    <p class="mt-1 text-sm leading-6 text-muted">The maximum number of times the Capsule can be opened per user account.</p>
                                    <input id="capsule-account-limit" name="account_limit" type="number" min="1" max="9007199254740991" step="1" inputmode="numeric" placeholder="No per-account limit" class="mt-4 min-h-12 w-full rounded-xl border border-line bg-white px-4 text-ink shadow-sm focus:border-brand focus:outline-none">
                                </div>
                            </div>
                            <p class="mt-4 text-sm leading-6 text-muted">When both are provided, the total limit must be greater than or equal to the per-account limit.</p>
                        </div>

                        <label class="flex items-start gap-3 rounded-xl border border-line p-4" for="capsule-automation-risk">
                            <input id="capsule-automation-risk" name="automation_risk_required" type="checkbox" value="1" class="mt-1 size-4 rounded border-line text-brand focus:ring-brand">
                            <span>
                                <span class="block font-semibold text-ink">Reject high automation risk</span>
                                <span class="mt-1 block text-sm leading-6 text-muted">Block access when Share Capsules detects opening patterns that strongly resemble automation. This does not verify someone’s identity or intentions.</span>
                            </span>
                        </label>
                    </div>

                    <div class="mt-5 rounded-xl bg-surface p-4 text-sm leading-6 text-muted">
                        <p><span class="font-semibold text-ink">What counts as an opening:</span> Share Capsules has approved access and released the decryption key. Simply loading the page or being denied does not count. In the unusual case that the connection fails after the key is released, it still counts even if the image never appears.</p>
                        <p class="mt-2">Leaving an optional restriction blank or off removes only that restriction. The basic account, email, extension, and counting requirements still apply.</p>
                    </div>
                </section>

                <section aria-labelledby="capsule-local-heading" class="mt-10 border-t border-line pt-8">
                    <p class="text-xs font-bold tracking-[0.14em] text-brand uppercase">Step 3</p>
                    <h2 id="capsule-local-heading" class="mt-2 text-xl font-semibold text-ink">Continue locally</h2>
                    <p class="mt-2 text-sm leading-6 text-muted">The extension will ask you to select the image, then encrypt and package it locally outside this web page.</p>

                    <button data-capsule-extension-handoff type="button" class="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Continue in the extension</button>
                    <p data-capsule-extension-status role="status" class="mt-3 text-sm leading-6 text-muted">A connected Share Capsules extension is required to continue.</p>
                </section>
            </div>

            <div class="space-y-5">
                <aside class="rounded-2xl border border-line bg-surface p-6" aria-labelledby="local-boundary-heading">
                    <h2 id="local-boundary-heading" class="font-semibold text-ink">Why the extension is required</h2>
                    <p class="mt-3 text-sm leading-6 text-muted">Your original image stays on your computer. It is inspected and encrypted locally by the installed Share Capsules extension and is never uploaded to Share Capsules servers. Only the encrypted Capsule is exported for you to publish.</p>
                    <h3 class="mt-5 font-semibold text-ink">Stays on your device</h3>
                    <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted marker:text-brand">
                        <li>Source image and decrypted pixels</li>
                        <li>Creator signing private key</li>
                        <li>Recovery code and unwrapped recovery material</li>
                    </ul>
                    <p class="mt-4 text-sm leading-6 text-muted">To make future approved openings possible, the extension securely sends the one-time decryption key to a separate protected Share Capsules key service. Your original image is not sent with it, and this Creator Studio page never receives either one.</p>
                    <p class="mt-5 border-t border-line pt-5 text-sm leading-6 text-muted">This page intentionally has no file upload, private-key field, recovery-code field, or server submission endpoint.</p>
                </aside>

                <aside class="rounded-2xl border border-amber-200 bg-amber-50 p-6" aria-labelledby="capture-risk-heading">
                    <h2 id="capture-risk-heading" class="font-semibold text-amber-950">Protection has a real boundary</h2>
                    <p class="mt-3 text-sm leading-6 text-amber-950/75">Share Capsules can make large-scale unauthorized access harder and keep track of approved openings. It cannot prevent an authorized viewer from taking screenshots, recording the screen, using a camera, modifying their browser, or otherwise copying content once shown.</p>
                </aside>
            </div>
        </div>

        <section aria-labelledby="hosting-heading" class="mt-8 rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
            <p class="text-xs font-bold tracking-[0.14em] text-brand uppercase">After export</p>
            <h2 id="hosting-heading" class="mt-2 text-xl font-semibold text-ink">Publish through a compatible Host</h2>
            <p class="mt-3 max-w-3xl text-sm leading-6 text-muted">You provide the exported Capsule, public preview, and generated <code>&lt;capsule-viewer&gt;</code> markup to a hosting service you choose. It serves the encrypted Capsule but never receives the original image, the decrypted image, or its decryption key.</p>

            <ul class="mt-6 grid gap-4 text-sm leading-6 text-muted md:grid-cols-2">
                <li class="rounded-xl bg-surface p-4"><span class="font-semibold text-ink">HTTPS:</span> both the page and Capsule URL must remain HTTPS, including redirects.</li>
                <li class="rounded-xl bg-surface p-4"><span class="font-semibold text-ink">Public retrieval:</span> allow an unauthenticated <code>GET</code>; <code>HEAD</code> is strongly recommended.</li>
                <li class="rounded-xl bg-surface p-4"><span class="font-semibold text-ink">Public CORS:</span> normally return <code>Access-Control-Allow-Origin: *</code> without credentials.</li>
                <li class="rounded-xl bg-surface p-4"><span class="font-semibold text-ink">Immutable revisions:</span> publish changed content or policy at a new URL instead of replacing existing bytes.</li>
            </ul>

            <p class="mt-5 text-sm leading-6 text-muted">A static website, storage service, CDN, or personal server can qualify. It does not need a database, user accounts, Share Capsules plugin, cookies, or custom server-side code.</p>
        </section>
    </section>
@endsection
