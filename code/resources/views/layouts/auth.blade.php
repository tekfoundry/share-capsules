@extends('layouts.app')

@section('content')
    <section class="mx-auto flex min-h-[calc(100vh-18rem)] max-w-7xl items-center justify-center px-5 py-16 sm:px-8 lg:px-10">
        <div class="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
            @yield('auth-content')
        </div>
    </section>
@endsection
