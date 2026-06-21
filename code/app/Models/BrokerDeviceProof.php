<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class BrokerDeviceProof extends Model
{
    protected $connection = 'broker';

    protected $primaryKey = 'jti';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];
}
