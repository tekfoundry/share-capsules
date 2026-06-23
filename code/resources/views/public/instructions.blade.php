@extends('layouts.app')

@section('title', 'Share Capsules instructions — install, create, host, and view Capsules')
@section('description', 'High-level Share Capsules instructions for installing the extension, creating a Capsule, hosting it on a website, and viewing protected content.')
@section('robots', 'index, follow')

@section('content')
    <section class="mx-auto max-w-5xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:px-10">
        <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Instructions</p>
        <h1 class="mt-5 max-w-4xl text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-6xl">Install, create, host, and view a Capsule.</h1>
        <p class="mt-7 max-w-3xl text-lg leading-8 text-muted">This page gives the practical flow at a high level. The important idea is simple: the original file stays local, the encrypted Capsule can be hosted anywhere compatible, and the Viewer extension handles authorization before decrypting.</p>

        <nav class="mt-10 grid gap-3 rounded-2xl border border-line bg-white p-4 text-sm font-bold shadow-card sm:grid-cols-2 lg:grid-cols-4" aria-label="Instruction sections">
            <a class="rounded-xl px-4 py-3 text-brand hover:bg-brand/5" href="#extension-installation">Extension Installation</a>
            <a class="rounded-xl px-4 py-3 text-brand hover:bg-brand/5" href="#capsule-creation">Capsule Creation</a>
            <a class="rounded-xl px-4 py-3 text-brand hover:bg-brand/5" href="#capsule-hosting">Capsule Hosting</a>
            <a class="rounded-xl px-4 py-3 text-brand hover:bg-brand/5" href="#capsule-viewing">Capsule Viewing</a>
        </nav>
    </section>

    <section class="border-y border-line bg-white py-16 sm:py-20">
        <div class="mx-auto grid max-w-5xl gap-8 px-5 sm:px-8 lg:px-10">
            <article id="extension-installation" class="scroll-mt-24 rounded-2xl border border-line bg-canvas p-6 sm:p-8">
                <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Extension Installation</p>
                <h2 class="mt-3 text-2xl font-semibold tracking-[-0.025em] text-ink">Install the Share Capsules browser extension.</h2>
                <p class="mt-4 text-sm leading-6 text-muted">Creators and viewers use the extension because file selection, encryption, signing, authorization, and decryption need a trusted local boundary. The original source file and private signing material should not be uploaded to the Share Capsules website.</p>
                <ol class="mt-5 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
                    <li>Install the official extension for your browser.</li>
                    <li>Open Share Capsules and sign in.</li>
                    <li>Let the extension connect to your account when prompted.</li>
                </ol>
            </article>

            <article id="capsule-creation" class="scroll-mt-24 rounded-2xl border border-line bg-canvas p-6 sm:p-8">
                <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Capsule Creation</p>
                <h2 class="mt-3 text-2xl font-semibold tracking-[-0.025em] text-ink">Create the protected Capsule locally.</h2>
                <p class="mt-4 text-sm leading-6 text-muted">In Creator Studio, enter the public details and access rules. Then continue in the extension, choose the file, and save the Capsule into your local workspace.</p>
                <ol class="mt-5 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
                    <li>Enter a title, optional description, and access limits.</li>
                    <li>Choose a workspace folder when the extension asks for one.</li>
                    <li>Save the recovery code separately if the extension shows one.</li>
                    <li>Choose the source file and create the `.capsule` file.</li>
                </ol>
            </article>

            <article id="capsule-hosting" class="scroll-mt-24 rounded-2xl border border-line bg-canvas p-6 sm:p-8">
                <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Capsule Hosting</p>
                <h2 class="mt-3 text-2xl font-semibold tracking-[-0.025em] text-ink">Upload the Capsule to your website or static file host.</h2>
                <p class="mt-4 text-sm leading-6 text-muted">Share Capsules does not need to host the encrypted file. Put the `.capsule` file at a permanent public HTTPS URL, then place a `<code>&lt;capsule-viewer&gt;</code>` tag on the page where protected content should appear.</p>
                <div class="mt-5 rounded-xl border border-line bg-white p-4">
                    <p class="text-sm font-bold text-ink">Example</p>
                    <pre class="mt-3 overflow-x-auto rounded-lg bg-ink p-4 text-xs leading-5 text-white"><code>&lt;capsule-viewer src="https://example.com/capsules/eclipse-photo.capsule"&gt;
  &lt;p&gt;Protected eclipse photo&lt;/p&gt;
&lt;/capsule-viewer&gt;</code></pre>
                </div>
                <ul class="mt-5 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
                    <li>The Capsule URL should be public HTTPS.</li>
                    <li>The host should allow public download without sign-in, cookies, or private tokens.</li>
                    <li>If the Capsule is on a different origin, the host should allow public cross-origin reads.</li>
                    <li>The fallback text between the tags is public and should still make sense without the extension.</li>
                </ul>
            </article>

            <article id="capsule-viewing" class="scroll-mt-24 rounded-2xl border border-line bg-canvas p-6 sm:p-8">
                <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Capsule Viewing</p>
                <h2 class="mt-3 text-2xl font-semibold tracking-[-0.025em] text-ink">Viewers open Capsules through the extension.</h2>
                <p class="mt-4 text-sm leading-6 text-muted">When a viewer visits a page with protected content, the extension verifies the Capsule, explains the access requirements, asks Share Capsules for authorization, and decrypts locally only after the policy is satisfied.</p>
                <ol class="mt-5 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
                    <li>The viewer installs and connects the extension.</li>
                    <li>The extension detects the Capsule on the page.</li>
                    <li>The viewer approves the requested access check when needed.</li>
                    <li>The extension decrypts and displays the content locally if authorized.</li>
                </ol>
            </article>
        </div>
    </section>
@endsection
