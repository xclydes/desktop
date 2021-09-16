import { Component } from '@angular/core';

import {
    ActivatedRoute,
    Router,
} from '@angular/router';

import { AccountService } from 'jslib-common/abstractions/account.service';
import { ApiService } from 'jslib-common/abstractions/api.service';
import { AuthService } from 'jslib-common/abstractions/auth.service';
import { CryptoFunctionService } from 'jslib-common/abstractions/cryptoFunction.service';
import { EnvironmentService } from 'jslib-common/abstractions/environment.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { PasswordGenerationService } from 'jslib-common/abstractions/passwordGeneration.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { StateService } from 'jslib-common/abstractions/state.service';
import { StorageService } from 'jslib-common/abstractions/storage.service';
import { SyncService } from 'jslib-common/abstractions/sync.service';

import { SsoComponent as BaseSsoComponent } from 'jslib-angular/components/sso.component';

import { StorageKey } from 'jslib-common/enums/storageKey';

@Component({
    selector: 'app-sso',
    templateUrl: 'sso.component.html',
})
export class SsoComponent extends BaseSsoComponent {
    constructor(authService: AuthService, router: Router,
        i18nService: I18nService, syncService: SyncService, route: ActivatedRoute,
        storageService: StorageService, stateService: StateService,
        platformUtilsService: PlatformUtilsService, apiService: ApiService,
        cryptoFunctionService: CryptoFunctionService, environmentService: EnvironmentService,
        passwordGenerationService: PasswordGenerationService, private accountService: AccountService) {
        super(authService, router, i18nService, route, storageService, stateService, platformUtilsService,
            apiService, cryptoFunctionService, environmentService, passwordGenerationService);
        super.onSuccessfulLogin = () => {
            return syncService.fullSync(true);
        };
        this.redirectUri = 'bitwarden://sso-callback';
        this.clientId = 'desktop';
        super.onSuccessfulLoginNavigate = async () => {
            if (await this.accountService.getSetting<boolean>(StorageKey.ForcePasswordReset)) {
                this.router.navigate(['update-temp-password']);
            } else {
                this.router.navigate([this.successRoute]);
            }
        };
    }
}
