import { Component } from '@angular/core';

import { AccountService } from 'jslib-common/abstractions/account.service';
import { CipherService } from 'jslib-common/abstractions/cipher.service';
import { CollectionService } from 'jslib-common/abstractions/collection.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';

import { ShareComponent as BaseShareComponent } from 'jslib-angular/components/share.component';

@Component({
    selector: 'app-vault-share',
    templateUrl: 'share.component.html',
})
export class ShareComponent extends BaseShareComponent {
    constructor(cipherService: CipherService, i18nService: I18nService,
        collectionService: CollectionService, platformUtilsService: PlatformUtilsService,
        accountService: AccountService) {
        super(collectionService, platformUtilsService, i18nService, cipherService, accountService);
    }
}
