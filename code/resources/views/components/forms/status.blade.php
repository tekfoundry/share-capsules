@if (session('status'))
    <div role="status" {{ $attributes->class('rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm leading-6 text-teal-900') }}>
        {{ session('status') }}
    </div>
@endif
