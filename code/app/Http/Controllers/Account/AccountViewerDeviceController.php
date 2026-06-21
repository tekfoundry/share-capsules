<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\UpdateViewerDeviceRequest;
use App\Models\User;
use App\Models\ViewerDevice;
use App\ViewerDevices\ViewerDeviceStatus;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

final class AccountViewerDeviceController extends Controller
{
    public function index(Request $request): View
    {
        /** @var User $user */
        $user = $request->user();

        return view('account.devices', [
            'devices' => $user->viewerDevices()->latest()->get(),
        ]);
    }

    public function update(
        UpdateViewerDeviceRequest $request,
        ViewerDevice $device,
    ): RedirectResponse {
        $this->authorizeOwnership($request, $device);
        $this->rejectRevoked($device);
        $device->update(['name' => $request->string('name')->trim()->toString()]);

        return back()->with('status', 'Device name updated.');
    }

    public function suspend(Request $request, ViewerDevice $device): RedirectResponse
    {
        $this->authorizeOwnership($request, $device);
        $this->rejectRevoked($device);
        $device->update([
            'status' => ViewerDeviceStatus::Suspended,
            'suspended_at' => now(),
        ]);

        return back()->with('status', 'Viewer device suspended.');
    }

    public function activate(Request $request, ViewerDevice $device): RedirectResponse
    {
        $this->authorizeOwnership($request, $device);
        $this->rejectRevoked($device);
        $device->update([
            'status' => ViewerDeviceStatus::Active,
            'suspended_at' => null,
        ]);

        return back()->with('status', 'Viewer device activated.');
    }

    public function destroy(Request $request, ViewerDevice $device): RedirectResponse
    {
        $this->authorizeOwnership($request, $device);

        if ($device->status !== ViewerDeviceStatus::Revoked) {
            $device->update([
                'status' => ViewerDeviceStatus::Revoked,
                'suspended_at' => null,
                'revoked_at' => now(),
            ]);
        }

        return back()->with('status', 'Viewer device permanently revoked.');
    }

    private function authorizeOwnership(Request $request, ViewerDevice $device): void
    {
        abort_unless($device->user_id === $request->user()?->getAuthIdentifier(), 403);
    }

    private function rejectRevoked(ViewerDevice $device): void
    {
        if ($device->status === ViewerDeviceStatus::Revoked) {
            throw ValidationException::withMessages([
                'device' => 'A revoked Viewer device cannot be changed or reactivated.',
            ]);
        }
    }
}
