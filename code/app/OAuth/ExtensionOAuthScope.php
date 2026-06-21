<?php

namespace App\OAuth;

enum ExtensionOAuthScope: string
{
    case Connect = 'extension:connect';
    case CtxAuthorize = 'ctx:authorize';
}
