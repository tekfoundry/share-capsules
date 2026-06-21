<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

final class AccountClosureStarted extends Notification
{
    use Queueable;

    public function __construct(private readonly string $recoveryToken) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        /** @var User $notifiable */
        $recoveryUrl = URL::temporarySignedRoute(
            'account.restore.show',
            $notifiable->deletion_due_at,
            ['user' => $notifiable->getKey(), 'token' => $this->recoveryToken],
        );

        return (new MailMessage)
            ->subject('Your Share Capsules account is scheduled for deletion')
            ->greeting('Your account is now closed')
            ->line('Account access, browser sessions, Viewer credentials, and protected viewing were suspended immediately.')
            ->line('Your account is scheduled for permanent deletion on '.$notifiable->deletion_due_at?->toDayDateTimeString().'.')
            ->line('Use the recovery link before that deadline if you want to restore the account. Old sessions and OAuth tokens will not be restored.')
            ->action('Review account recovery', $recoveryUrl)
            ->line('If you did not close this account, use the recovery link and contact info@tekfoundry.com.');
    }
}
