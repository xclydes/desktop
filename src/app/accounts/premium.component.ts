import {
    Component,
} from '@angular/core';

import { AccountService } from 'jslib-common/abstractions/account.service';
import { ApiService } from 'jslib-common/abstractions/api.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';

import { PremiumComponent as BasePremiumComponent } from 'jslib-angular/components/premium.component';

@Component({
    selector: 'app-premium',
    templateUrl: 'premium.component.html',
})
export class PremiumComponent extends BasePremiumComponent {
    constructor(i18nService: I18nService, platformUtilsService: PlatformUtilsService,
        apiService: ApiService, accountService: AccountService) {
        super(i18nService, platformUtilsService, apiService, accountService);
    }
}
