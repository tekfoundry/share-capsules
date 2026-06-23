<dialog
    class="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50"
    aria-labelledby="confirmation-dialog-title"
    aria-describedby="confirmation-dialog-message"
    data-confirmation-dialog
>
    <div class="p-6 sm:p-7">
        <h2 id="confirmation-dialog-title" class="text-xl font-bold" data-confirmation-title>Confirm this change</h2>
        <p id="confirmation-dialog-message" class="mt-3 leading-6 text-muted" data-confirmation-message>This action may not be reversible.</p>

        <div class="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button class="min-h-11 rounded-xl border border-line bg-white px-4 text-sm font-bold text-ink hover:bg-surface" type="button" data-confirmation-cancel>Cancel</button>
            <button class="min-h-11 rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800" type="button" data-confirmation-accept>Confirm</button>
        </div>
    </div>
</dialog>
