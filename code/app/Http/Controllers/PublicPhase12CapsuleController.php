<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final class PublicPhase12CapsuleController extends Controller
{
    public function __invoke(Request $request): BinaryFileResponse
    {
        $response = response()->file(public_path('capsules/phase12/tekfoundry-logo.capsule'), [
            'Content-Type' => 'application/octet-stream',
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, HEAD',
            'Access-Control-Max-Age' => '86400',
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);

        $response->setPublic();
        $response->setMaxAge(31536000);
        $response->headers->addCacheControlDirective('immutable');

        return $response;
    }
}
