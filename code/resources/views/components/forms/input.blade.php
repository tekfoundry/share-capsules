@props([
    'label',
    'name',
    'type' => 'text',
    'autocomplete' => null,
    'required' => false,
    'value' => null,
])

<div>
    <label for="{{ $name }}" class="block text-sm font-semibold text-ink">{{ $label }}</label>
    <input
        id="{{ $name }}"
        name="{{ $name }}"
        type="{{ $type }}"
        value="{{ $type === 'password' ? '' : old($name, $value) }}"
        @if ($autocomplete) autocomplete="{{ $autocomplete }}" @endif
        @required($required)
        {{ $attributes->class([
            'mt-2 block min-h-12 w-full rounded-xl border bg-white px-3.5 text-base text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-3 focus:ring-brand/10',
            'border-red-400' => $errors->has($name),
            'border-line' => ! $errors->has($name),
        ]) }}
    >
    @error($name)
        <p class="mt-2 text-sm text-red-700">{{ $message }}</p>
    @enderror
</div>
