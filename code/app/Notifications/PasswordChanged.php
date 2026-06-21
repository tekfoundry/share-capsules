<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class PasswordChanged extends Notification
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
            ->subject('Your Share Capsules password was changed')
            ->greeting('Your password was changed')
            ->line('The password for your Share Capsules account was changed successfully.')
            ->line('All existing browser sessions were revoked as a security precaution.')
            ->action('Sign in to Share Capsules', route('login'))
            ->line('If you did not make this change, contact info@tekfoundry.com immediately.');
    }
}
