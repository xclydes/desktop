import { Component } from '@angular/core';

import { AccountService } from 'jslib-common/abstractions/account.service';
import { ApiService } from 'jslib-common/abstractions/api.service';
import { CipherService } from 'jslib-common/abstractions/cipher.service';
import { CryptoService } from 'jslib-common/abstractions/crypto.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';

import { AttachmentsComponent as BaseAttachmentsComponent } from 'jslib-angular/components/attachments.component';

@Component({
    selector: 'app-vault-attachments',
    templateUrl: 'attachments.component.html',
})
export class AttachmentsComponent extends BaseAttachmentsComponent {
    constructor(cipherService: CipherService, i18nService: I18nService,
        cryptoService: CryptoService, platformUtilsService: PlatformUtilsService,
        apiService: ApiService, accountService: AccountService) {
        super(cipherService, i18nService, cryptoService, platformUtilsService, apiService, window, accountService);
    }
}
