import {
    BodyOutputType,
    Toast,
    ToasterConfig,
    ToasterService,
} from 'angular2-toaster';

import {
    Component,
    NgZone,
    OnInit,
    SecurityContext,
    Type,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { PremiumComponent } from './accounts/premium.component';
import { SettingsComponent } from './accounts/settings.component';
import { PasswordGeneratorHistoryComponent } from './vault/password-generator-history.component';

import { BroadcasterService } from 'jslib-angular/services/broadcaster.service';

import { AccountService } from 'jslib-common/abstractions/account.service';
import { AuthService } from 'jslib-common/abstractions/auth.service';
import { CipherService } from 'jslib-common/abstractions/cipher.service';
import { CollectionService } from 'jslib-common/abstractions/collection.service';
import { CryptoService } from 'jslib-common/abstractions/crypto.service';
import { EventService } from 'jslib-common/abstractions/event.service';
import { FolderService } from 'jslib-common/abstractions/folder.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { MessagingService } from 'jslib-common/abstractions/messaging.service';
import { NotificationsService } from 'jslib-common/abstractions/notifications.service';
import { PasswordGenerationService } from 'jslib-common/abstractions/passwordGeneration.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { PolicyService } from 'jslib-common/abstractions/policy.service';
import { SearchService } from 'jslib-common/abstractions/search.service';
import { SettingsService } from 'jslib-common/abstractions/settings.service';
import { StateService } from 'jslib-common/abstractions/state.service';
import { SyncService } from 'jslib-common/abstractions/sync.service';
import { SystemService } from 'jslib-common/abstractions/system.service';
import { TokenService } from 'jslib-common/abstractions/token.service';
import { VaultTimeoutService } from 'jslib-common/abstractions/vaultTimeout.service';

import { CipherType } from 'jslib-common/enums/cipherType';
import { StorageKey } from 'jslib-common/enums/storageKey';

import { ModalRef } from 'jslib-angular/components/modal/modal.ref';
import { ModalService } from 'jslib-angular/services/modal.service';
import { ExportComponent } from './vault/export.component';
import { FolderAddEditComponent } from './vault/folder-add-edit.component';
import { PasswordGeneratorComponent } from './vault/password-generator.component';

const BroadcasterSubscriptionId = 'AppComponent';
const IdleTimeout = 60000 * 10; // 10 minutes
const SyncInterval = 6 * 60 * 60 * 1000; // 6 hours

@Component({
    selector: 'app-root',
    styles: [],
    template: `
        <toaster-container [toasterconfig]="toasterConfig" aria-live="polite"></toaster-container>
        <ng-template #settings></ng-template>
        <ng-template #premium></ng-template>
        <ng-template #passwordHistory></ng-template>
        <ng-template #appFolderAddEdit></ng-template>
        <ng-template #exportVault></ng-template>
        <ng-template #appPasswordGenerator></ng-template>
        <router-outlet></router-outlet>`,
})
export class AppComponent implements OnInit {
    @ViewChild('settings', { read: ViewContainerRef, static: true }) settingsRef: ViewContainerRef;
    @ViewChild('premium', { read: ViewContainerRef, static: true }) premiumRef: ViewContainerRef;
    @ViewChild('passwordHistory', { read: ViewContainerRef, static: true }) passwordHistoryRef: ViewContainerRef;
    @ViewChild('exportVault', { read: ViewContainerRef, static: true }) exportVaultModalRef: ViewContainerRef;
    @ViewChild('appFolderAddEdit', { read: ViewContainerRef, static: true })
        folderAddEditModalRef: ViewContainerRef;
    @ViewChild('appPasswordGenerator', { read: ViewContainerRef, static: true })
        passwordGeneratorModalRef: ViewContainerRef;

    toasterConfig: ToasterConfig = new ToasterConfig({
        showCloseButton: true,
        mouseoverTimerStop: true,
        animation: 'flyRight',
        limit: 5,
    });

    private lastActivity: number = null;
    private modal: ModalRef = null;
    private idleTimer: number = null;
    private isIdle = false;

    constructor(private broadcasterService: BroadcasterService, private tokenService: TokenService,
        private folderService: FolderService, private settingsService: SettingsService,
        private syncService: SyncService, private passwordGenerationService: PasswordGenerationService,
        private cipherService: CipherService, private authService: AuthService,
        private router: Router, private toasterService: ToasterService,
        private i18nService: I18nService, private sanitizer: DomSanitizer,
        private ngZone: NgZone, private vaultTimeoutService: VaultTimeoutService,
        private cryptoService: CryptoService, private messagingService: MessagingService,
        private collectionService: CollectionService, private searchService: SearchService,
        private notificationsService: NotificationsService, private platformUtilsService: PlatformUtilsService,
        private systemService: SystemService, private stateService: StateService,
        private eventService: EventService, private policyService: PolicyService,
        private modalService: ModalService, private accountService: AccountService) { }

    ngOnInit() {
        this.ngZone.runOutsideAngular(() => {
            setTimeout(async () => {
                await this.updateAppMenu();
            }, 1000);

            window.onmousemove = () => this.recordActivity();
            window.onmousedown = () => this.recordActivity();
            window.ontouchstart = () => this.recordActivity();
            window.onclick = () => this.recordActivity();
            window.onscroll = () => this.recordActivity();
            window.onkeypress = () => this.recordActivity();
        });

        this.broadcasterService.subscribe(BroadcasterSubscriptionId, async (message: any) => {
            this.ngZone.run(async () => {
                switch (message.command) {
                    case 'loggedIn':
                    case 'unlocked':
                        this.notificationsService.updateConnection();
                        this.updateAppMenu();
                        this.systemService.cancelProcessReload();
                        break;
                    case 'loggedOut':
                        if (this.modal != null) {
                            this.modal.close();
                        }
                        this.notificationsService.updateConnection();
                        this.updateAppMenu();
                        this.systemService.startProcessReload();
                        await this.systemService.clearPendingClipboard();
                        break;
                    case 'authBlocked':
                        this.router.navigate(['login']);
                        break;
                    case 'logout':
                        this.logOut(!!message.expired);
                        break;
                    case 'lockVault':
                        await this.vaultTimeoutService.lock(true);
                        break;
                    case 'locked':
                        if (this.modal != null) {
                            this.modal.close();
                        }
                        this.stateService.purge();
                        this.router.navigate(['lock']);
                        this.notificationsService.updateConnection();
                        this.updateAppMenu();
                        this.systemService.startProcessReload();
                        await this.systemService.clearPendingClipboard();
                        break;
                    case 'reloadProcess':
                        window.location.reload(true);
                        break;
                    case 'syncStarted':
                        break;
                    case 'syncCompleted':
                        break;
                    case 'openSettings':
                        await this.openModal<SettingsComponent>(SettingsComponent, this.settingsRef);
                        break;
                    case 'openPremium':
                        await this.openModal<PremiumComponent>(PremiumComponent, this.premiumRef);
                        break;
                    case 'showFingerprintPhrase':
                        const fingerprint = await this.cryptoService.getFingerprint(
                            this.accountService.activeAccount?.userId);
                        const result = await this.platformUtilsService.showDialog(
                            this.i18nService.t('yourAccountsFingerprint') + ':\n' + fingerprint.join('-'),
                            this.i18nService.t('fingerprintPhrase'), this.i18nService.t('learnMore'),
                            this.i18nService.t('close'));
                        if (result) {
                           this.platformUtilsService.launchUri(
                                'https://help.bitwarden.com/article/fingerprint-phrase/');
                        }
                        break;
                    case 'openPasswordHistory':
                        await this.openModal<PasswordGeneratorHistoryComponent>(
                            PasswordGeneratorHistoryComponent, this.passwordHistoryRef);
                        break;
                    case 'showToast':
                        this.showToast(message);
                        break;
                    case 'copiedToClipboard':
                        if (!message.clearing) {
                            this.systemService.clearClipboard(message.clipboardValue, message.clearMs);
                        }
                        break;
                    case 'ssoCallback':
                        this.router.navigate(['sso'], { queryParams: { code: message.code, state: message.state } });
                        break;
                    case 'premiumRequired':
                        const premiumConfirmed = await this.platformUtilsService.showDialog(
                            this.i18nService.t('premiumRequiredDesc'), this.i18nService.t('premiumRequired'),
                            this.i18nService.t('learnMore'), this.i18nService.t('cancel'));
                        if (premiumConfirmed) {
                            await this.openModal<PremiumComponent>(PremiumComponent, this.premiumRef);
                        }
                        break;
                    case 'emailVerificationRequired':
                        const emailVerificationConfirmed = await this.platformUtilsService.showDialog(
                            this.i18nService.t('emailVerificationRequiredDesc'),
                            this.i18nService.t('emailVerificationRequired'),
                            this.i18nService.t('learnMore'), this.i18nService.t('cancel'));
                        if (emailVerificationConfirmed) {
                            this.platformUtilsService.launchUri('https://bitwarden.com/help/article/create-bitwarden-account/');
                        }
                        break;
                    case 'syncVault':
                        try {
                            await this.syncService.fullSync(true, true);
                            this.toasterService.popAsync('success', null, this.i18nService.t('syncingComplete'));
                        } catch {
                            this.toasterService.popAsync('error', null, this.i18nService.t('syncingFailed'));
                        }
                        break;
                    case 'checkSyncVault':
                        try {
                            const lastSync = await this.syncService.getLastSync();
                            let lastSyncAgo = SyncInterval + 1;
                            if (lastSync != null) {
                                lastSyncAgo = new Date().getTime() - lastSync.getTime();
                            }

                            if (lastSyncAgo >= SyncInterval) {
                                await this.syncService.fullSync(false);
                            }
                        } catch { }
                        this.messagingService.send('scheduleNextSync');
                        break;
                    case 'exportVault':
                        await this.openExportVault();
                        break;
                    case 'newLogin':
                        this.routeToVault('add', CipherType.Login);
                        break;
                    case 'newCard':
                        this.routeToVault('add', CipherType.Card);
                        break;
                    case 'newIdentity':
                        this.routeToVault('add', CipherType.Identity);
                        break;
                    case 'newSecureNote':
                        this.routeToVault('add', CipherType.SecureNote);
                        break;
                    default:
                        break;
                    case 'newFolder':
                        await this.addFolder();
                        break;
                    case 'openPasswordGenerator':
                        // openPasswordGenerator has extended functionality if called in the vault
                        if (!this.router.url.includes('vault')) {
                            await this.openPasswordGenerator();
                        }
                        break;
                }
            });
        });
    }

    ngOnDestroy() {
        this.broadcasterService.unsubscribe(BroadcasterSubscriptionId);
    }

    async openExportVault() {
        if (this.modal != null) {
            this.modal.close();
        }

        const [modal, childComponent] = await this.modalService.openViewRef(ExportComponent, this.exportVaultModalRef);
        this.modal = modal;

        childComponent.onSaved.subscribe(() => {
            this.modal.close();
        });

        this.modal.onClosed.subscribe(() => {
            this.modal = null;
        });
    }

    async addFolder() {
        if (this.modal != null) {
            this.modal.close();
        }

        const [modal, childComponent] = await this.modalService.openViewRef(FolderAddEditComponent,
            this.folderAddEditModalRef, comp => comp.folderId = null);
        this.modal = modal;

        childComponent.onSavedFolder.subscribe(async () => {
            this.modal.close();
            this.syncService.fullSync(false);
        });

        this.modal.onClosed.subscribe(() => {
            this.modal = null;
        });
    }

    async openPasswordGenerator() {
        if (this.modal != null) {
            this.modal.close();
        }

        [this.modal] = await this.modalService.openViewRef(PasswordGeneratorComponent, this.folderAddEditModalRef,
            comp => comp.showSelect = false);

        this.modal.onClosed.subscribe(() => {
            this.modal = null;
        });
    }

    private async updateAppMenu() {
        this.messagingService.send('updateAppMenu', {
            isAuthenticated: this.accountService.activeAccount?.isAuthenticated,
            isLocked: await this.vaultTimeoutService.isLocked(),
        });
    }

    private async logOut(expired: boolean) {
        await this.eventService.uploadEvents();
        const userId = this.accountService.activeAccount?.userId;

        await Promise.all([
            this.eventService.clearEvents(),
            this.syncService.setLastSync(new Date(0)),
            this.tokenService.clearToken(),
            this.cryptoService.clearKeys(),
            this.settingsService.clear(userId),
            this.cipherService.clear(userId),
            this.folderService.clear(userId),
            this.collectionService.clear(userId),
            this.passwordGenerationService.clear(),
            this.vaultTimeoutService.clear(),
            this.stateService.purge(),
            this.policyService.clear(userId),
            this.accountService.removeAccount(userId)
        ]);

        this.vaultTimeoutService.biometricLocked = true;
        this.searchService.clearIndex();
        this.authService.logOut(async () => {
            if (expired) {
                this.toasterService.popAsync('warning', this.i18nService.t('loggedOut'),
                    this.i18nService.t('loginExpired'));
            }
            this.router.navigate(['login']);
        });
    }

    private async recordActivity() {
        const now = (new Date()).getTime();
        if (this.lastActivity != null && now - this.lastActivity < 250) {
            return;
        }

        this.lastActivity = now;
        this.accountService.saveSetting(StorageKey.LastActive, now);

        // Idle states
        if (this.isIdle) {
            this.isIdle = false;
            this.idleStateChanged();
        }
        if (this.idleTimer != null) {
            window.clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
        this.idleTimer = window.setTimeout(() => {
            if (!this.isIdle) {
                this.isIdle = true;
                this.idleStateChanged();
            }
        }, IdleTimeout);
    }

    private idleStateChanged() {
        if (this.isIdle) {
            this.notificationsService.disconnectFromInactivity();
        } else {
            this.notificationsService.reconnectFromActivity();
        }
    }

    private async openModal<T>(type: Type<T>, ref: ViewContainerRef) {
        if (this.modal != null) {
            this.modal.close();
        }

        [this.modal] = await this.modalService.openViewRef(type, ref);

        this.modal.onClosed.subscribe(() => {
            this.modal = null;
        });
    }

    private showToast(msg: any) {
        const toast: Toast = {
            type: msg.type,
            title: msg.title,
        };
        if (typeof (msg.text) === 'string') {
            toast.body = msg.text;
        } else if (msg.text.length === 1) {
            toast.body = msg.text[0];
        } else {
            let message = '';
            msg.text.forEach((t: string) =>
                message += ('<p>' + this.sanitizer.sanitize(SecurityContext.HTML, t) + '</p>'));
            toast.body = message;
            toast.bodyOutputType = BodyOutputType.TrustedHtml;
        }
        if (msg.options != null) {
            if (msg.options.trustedHtml === true) {
                toast.bodyOutputType = BodyOutputType.TrustedHtml;
            }
            if (msg.options.timeout != null && msg.options.timeout > 0) {
                toast.timeout = msg.options.timeout;
            }
        }
        this.toasterService.popAsync(toast);
    }

    private routeToVault(action: string, cipherType: CipherType) {
        if (!this.router.url.includes('vault')) {
            this.router.navigate(['/vault'], {
                queryParams: {
                    action: action,
                    addType: cipherType,
                },
                replaceUrl: true,
            });
        }
    }
}
