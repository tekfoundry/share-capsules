<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class AccountRestored extends Notification
{
    use Queueable;

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your Share Capsules account was restored')
            ->greeting('Your account is active again')
            ->line('The pending deletion was cancelled and your Share Capsules account was restored.')
            ->line('Previous browser sessions and OAuth tokens remain revoked. Viewer devices remain suspended until you review and reactivate them.')
            ->action('Sign in to Share Capsules', route('login'))
            ->line('If you did not restore this account, reset your password and contact info@tekfoundry.com immediately.');
    }
}
