import {
    ChangeDetectorRef,
    Component,
    NgZone,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import {
    ActivatedRoute,
    Router,
} from '@angular/router';

import { ToasterService } from 'angular2-toaster';

import { BroadcasterService } from 'jslib-angular/services/broadcaster.service';

import { AddEditComponent } from './add-edit.component';
import { AttachmentsComponent } from './attachments.component';
import { CiphersComponent } from './ciphers.component';
import { CollectionsComponent } from './collections.component';
import { FolderAddEditComponent } from './folder-add-edit.component';
import { GroupingsComponent } from './groupings.component';
import { PasswordGeneratorComponent } from './password-generator.component';
import { PasswordHistoryComponent } from './password-history.component';
import { ShareComponent } from './share.component';
import { ViewComponent } from './view.component';

import { CipherRepromptType } from 'jslib-common/enums/cipherRepromptType';
import { CipherType } from 'jslib-common/enums/cipherType';
import { EventType } from 'jslib-common/enums/eventType';

import { CipherView } from 'jslib-common/models/view/cipherView';
import { FolderView } from 'jslib-common/models/view/folderView';

import { ModalRef } from 'jslib-angular/components/modal/modal.ref';

import { AccountService } from 'jslib-common/abstractions/account.service';
import { EventService } from 'jslib-common/abstractions/event.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { MessagingService } from 'jslib-common/abstractions/messaging.service';
import { PasswordRepromptService } from 'jslib-common/abstractions/passwordReprompt.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { SyncService } from 'jslib-common/abstractions/sync.service';
import { TotpService } from 'jslib-common/abstractions/totp.service';

import { ModalService } from 'jslib-angular/services/modal.service';

import { invokeMenu, RendererMenuItem } from 'jslib-electron/utils';

const BroadcasterSubscriptionId = 'VaultComponent';

@Component({
    selector: 'app-vault',
    templateUrl: 'vault.component.html',
})
export class VaultComponent implements OnInit, OnDestroy {
    @ViewChild(ViewComponent) viewComponent: ViewComponent;
    @ViewChild(AddEditComponent) addEditComponent: AddEditComponent;
    @ViewChild(CiphersComponent, { static: true }) ciphersComponent: CiphersComponent;
    @ViewChild(GroupingsComponent, { static: true }) groupingsComponent: GroupingsComponent;
    @ViewChild('passwordGenerator', { read: ViewContainerRef, static: true }) passwordGeneratorModalRef: ViewContainerRef;
    @ViewChild('attachments', { read: ViewContainerRef, static: true }) attachmentsModalRef: ViewContainerRef;
    @ViewChild('passwordHistory', { read: ViewContainerRef, static: true }) passwordHistoryModalRef: ViewContainerRef;
    @ViewChild('share', { read: ViewContainerRef, static: true }) shareModalRef: ViewContainerRef;
    @ViewChild('collections', { read: ViewContainerRef, static: true }) collectionsModalRef: ViewContainerRef;
    @ViewChild('folderAddEdit', { read: ViewContainerRef, static: true }) folderAddEditModalRef: ViewContainerRef;

    action: string;
    cipherId: string = null;
    favorites: boolean = false;
    type: CipherType = null;
    folderId: string = null;
    collectionId: string = null;
    addType: CipherType = null;
    addOrganizationId: string = null;
    addCollectionIds: string[] = null;
    showingModal = false;
    deleted = false;
    userHasPremiumAccess = false;

    private modal: ModalRef = null;

    constructor(private route: ActivatedRoute, private router: Router,
        private i18nService: I18nService, private modalService: ModalService,
        private broadcasterService: BroadcasterService, private changeDetectorRef: ChangeDetectorRef,
        private ngZone: NgZone, private syncService: SyncService,
        private toasterService: ToasterService, private messagingService: MessagingService,
        private platformUtilsService: PlatformUtilsService, private eventService: EventService,
        private totpService: TotpService, private passwordRepromptService: PasswordRepromptService,
        private accountService: AccountService) { }

    async ngOnInit() {
        this.userHasPremiumAccess = this.accountService.activeAccount.canAccessPremium;
        this.broadcasterService.subscribe(BroadcasterSubscriptionId, (message: any) => {
            this.ngZone.run(async () => {
                let detectChanges = true;

                switch (message.command) {
                    case 'newLogin':
                        await this.addCipher(CipherType.Login);
                        break;
                    case 'newCard':
                        await this.addCipher(CipherType.Card);
                        break;
                    case 'newIdentity':
                        await this.addCipher(CipherType.Identity);
                        break;
                    case 'newSecureNote':
                        await this.addCipher(CipherType.SecureNote);
                        break;
                    case 'focusSearch':
                        (document.querySelector('#search') as HTMLInputElement).select();
                        detectChanges = false;
                        break;
                    case 'openPasswordGenerator':
                        await this.openPasswordGenerator(false);
                        break;
                    case 'syncCompleted':
                        await this.load();
                        break;
                    case 'refreshCiphers':
                        this.ciphersComponent.refresh();
                        break;
                    case 'modalShown':
                        this.showingModal = true;
                        break;
                    case 'modalClosed':
                        this.showingModal = false;
                        break;
                    case 'copyUsername':
                        const uComponent = this.addEditComponent == null ? this.viewComponent : this.addEditComponent;
                        const uCipher = uComponent != null ? uComponent.cipher : null;
                        if (this.cipherId != null && uCipher != null && uCipher.id === this.cipherId &&
                            uCipher.login != null && uCipher.login.username != null) {
                            this.copyValue(uCipher, uCipher.login.username, 'username', 'Username');
                        }
                        break;
                    case 'copyPassword':
                        const pComponent = this.addEditComponent == null ? this.viewComponent : this.addEditComponent;
                        const pCipher = pComponent != null ? pComponent.cipher : null;
                        if (this.cipherId != null && pCipher != null && pCipher.id === this.cipherId &&
                            pCipher.login != null && pCipher.login.password != null && pCipher.viewPassword) {
                            this.copyValue(pCipher, pCipher.login.password, 'password', 'Password');
                        }
                        break;
                    case 'copyTotp':
                        const tComponent = this.addEditComponent == null ? this.viewComponent : this.addEditComponent;
                        const tCipher = tComponent != null ? tComponent.cipher : null;
                        if (this.cipherId != null && tCipher != null && tCipher.id === this.cipherId &&
                            tCipher.login != null && tCipher.login.hasTotp && this.userHasPremiumAccess) {
                            const value = await this.totpService.getCode(tCipher.login.totp);
                            this.copyValue(tCipher, value, 'verificationCodeTotp', 'TOTP');
                        }
                    default:
                        detectChanges = false;
                        break;
                }

                if (detectChanges) {
                    this.changeDetectorRef.detectChanges();
                }
            });
        });

        if (!this.syncService.syncInProgress) {
            await this.load();
        }
        document.body.classList.remove('layout_frontend');
    }

    ngOnDestroy() {
        this.broadcasterService.unsubscribe(BroadcasterSubscriptionId);
        document.body.classList.add('layout_frontend');
    }

    async load() {
        let loaded = false;
        const queryParamsSub = this.route.queryParams.subscribe(async params => {
            if (loaded) {
                return;
            }
            loaded = true;
            await this.groupingsComponent.load();

            if (params == null) {
                this.groupingsComponent.selectedAll = true;
                await this.ciphersComponent.reload();
            } else {
                if (params.cipherId) {
                    const cipherView = new CipherView();
                    cipherView.id = params.cipherId;
                    if (params.action === 'clone') {
                        await this.cloneCipher(cipherView);
                    } else if (params.action === 'edit') {
                        await this.editCipher(cipherView);
                    } else {
                        await this.viewCipher(cipherView);
                    }
                } else if (params.action === 'add') {
                    this.addType = Number(params.addType);
                    this.addCipher(this.addType);
                }

                if (params.deleted) {
                    this.groupingsComponent.selectedTrash = true;
                    await this.filterDeleted();
                } else if (params.favorites) {
                    this.groupingsComponent.selectedFavorites = true;
                    await this.filterFavorites();
                } else if (params.type && params.action !== 'add') {
                    const t = parseInt(params.type, null);
                    this.groupingsComponent.selectedType = t;
                    await this.filterCipherType(t);
                } else if (params.folderId) {
                    this.groupingsComponent.selectedFolder = true;
                    this.groupingsComponent.selectedFolderId = params.folderId;
                    await this.filterFolder(params.folderId);
                } else if (params.collectionId) {
                    this.groupingsComponent.selectedCollectionId = params.collectionId;
                    await this.filterCollection(params.collectionId);
                } else {
                    this.groupingsComponent.selectedAll = true;
                    await this.ciphersComponent.reload();
                }
            }
            if (queryParamsSub != null) {
                queryParamsSub.unsubscribe();
            }
        });
    }

    async viewCipher(cipher: CipherView) {
        if (!await this.canNavigateAway('view', cipher)) {
            return;
        }

        this.cipherId = cipher.id;
        this.action = 'view';
        this.go();
    }

    viewCipherMenu(cipher: CipherView) {
        const menu: RendererMenuItem[] = [
            {
                label: this.i18nService.t('view'),
                click: () => this.functionWithChangeDetection(() => {
                    this.viewCipher(cipher);
                }),
            },
        ];
        if (!cipher.isDeleted) {
            menu.push({
                label: this.i18nService.t('edit'),
                click: () => this.functionWithChangeDetection(() => {
                    this.editCipher(cipher);
                }),
            });
            menu.push({
                label: this.i18nService.t('clone'),
                click: () => this.functionWithChangeDetection(() => {
                    this.cloneCipher(cipher);
                }),
            });
        }

        switch (cipher.type) {
            case CipherType.Login:
                if (cipher.login.canLaunch || cipher.login.username != null || cipher.login.password != null) {
                    menu.push({ type: 'separator' });
                }
                if (cipher.login.canLaunch) {
                    menu.push({
                        label: this.i18nService.t('launch'),
                        click: () => this.platformUtilsService.launchUri(cipher.login.launchUri),
                    });
                }
                if (cipher.login.username != null) {
                    menu.push({
                        label: this.i18nService.t('copyUsername'),
                        click: () => this.copyValue(cipher, cipher.login.username, 'username', 'Username'),
                    });
                }
                if (cipher.login.password != null && cipher.viewPassword) {
                    menu.push({
                        label: this.i18nService.t('copyPassword'),
                        click: () => {
                            this.copyValue(cipher, cipher.login.password, 'password', 'Password');
                            this.eventService.collect(EventType.Cipher_ClientCopiedPassword, cipher.id);
                        },
                    });
                }
                if (cipher.login.hasTotp && (cipher.organizationUseTotp || this.userHasPremiumAccess)) {
                    menu.push({
                        label: this.i18nService.t('copyVerificationCodeTotp'),
                        click: async () => {
                            const value = await this.totpService.getCode(cipher.login.totp);
                            this.copyValue(cipher, value, 'verificationCodeTotp', 'TOTP');
                        },
                    });
                }
                break;
            case CipherType.Card:
                if (cipher.card.number != null || cipher.card.code != null) {
                    menu.push({ type: 'separator' });
                }
                if (cipher.card.number != null) {
                    menu.push({
                        label: this.i18nService.t('copyNumber'),
                        click: () => this.copyValue(cipher, cipher.card.number, 'number', 'Card Number'),
                    });
                }
                if (cipher.card.code != null) {
                    menu.push({
                        label: this.i18nService.t('copySecurityCode'),
                        click: () => {
                            this.copyValue(cipher, cipher.card.code, 'securityCode', 'Security Code');
                            this.eventService.collect(EventType.Cipher_ClientCopiedCardCode, cipher.id);
                        },
                    });
                }
                break;
            default:
                break;
        }

        invokeMenu(menu);
    }

    async editCipher(cipher: CipherView) {
        if (!await this.canNavigateAway('edit', cipher)) {
            return;
        } else if (!await this.passwordReprompt(cipher)) {
            return;
        }

        await this.editCipherWithoutPasswordPrompt(cipher);
    }

    async editCipherWithoutPasswordPrompt(cipher: CipherView) {
        if (!await this.canNavigateAway('edit', cipher)) {
            return;
        }

        this.cipherId = cipher.id;
        this.action = 'edit';
        this.go();
    }

    async cloneCipher(cipher: CipherView) {
        if (!await this.canNavigateAway('clone', cipher)) {
            return;
        } else if (!await this.passwordReprompt(cipher)) {
            return;
        }

        await this.cloneCipherWithoutPasswordPrompt(cipher);
    }

    async cloneCipherWithoutPasswordPrompt(cipher: CipherView) {
        if (!await this.canNavigateAway('edit', cipher)) {
            return;
        }

        this.cipherId = cipher.id;
        this.action = 'clone';
        this.go();
    }

    async addCipher(type: CipherType = null) {
        if (!await this.canNavigateAway('add', null)) {
            return;
        }

        this.addType = type;
        this.action = 'add';
        this.cipherId = null;
        this.updateCollectionProperties();
        this.go();
    }

    addCipherOptions() {
        const menu: RendererMenuItem[] = [
            {
                label: this.i18nService.t('typeLogin'),
                click: () => this.addCipherWithChangeDetection(CipherType.Login),
            },
            {
                label: this.i18nService.t('typeCard'),
                click: () => this.addCipherWithChangeDetection(CipherType.Card),
            },
            {
                label: this.i18nService.t('typeIdentity'),
                click: () => this.addCipherWithChangeDetection(CipherType.Identity),
            },
            {
                label: this.i18nService.t('typeSecureNote'),
                click: () => this.addCipherWithChangeDetection(CipherType.SecureNote),
            },

        ];

        invokeMenu(menu);
    }

    async savedCipher(cipher: CipherView) {
        this.cipherId = cipher.id;
        this.action = 'view';
        this.go();
        await this.ciphersComponent.refresh();
    }

    async deletedCipher(cipher: CipherView) {
        this.cipherId = null;
        this.action = null;
        this.go();
        await this.ciphersComponent.refresh();
    }

    async restoredCipher(cipher: CipherView) {
        this.cipherId = null;
        this.action = null;
        this.go();
        await this.ciphersComponent.refresh();
    }

    async editCipherAttachments(cipher: CipherView) {
        if (this.modal != null) {
            this.modal.close();
        }

        const [modal, childComponent] = await this.modalService.openViewRef(AttachmentsComponent, this.attachmentsModalRef,
            comp => comp.cipherId = cipher.id);
        this.modal = modal;

        let madeAttachmentChanges = false;
        childComponent.onUploadedAttachment.subscribe(() => madeAttachmentChanges = true);
        childComponent.onDeletedAttachment.subscribe(() => madeAttachmentChanges = true);

        this.modal.onClosed.subscribe(async () => {
            this.modal = null;
            if (madeAttachmentChanges) {
                await this.ciphersComponent.refresh();
            }
            madeAttachmentChanges = false;
        });
    }

    async shareCipher(cipher: CipherView) {
        if (this.modal != null) {
            this.modal.close();
        }

        const [modal, childComponent] = await this.modalService.openViewRef(ShareComponent, this.shareModalRef,
            comp => comp.cipherId = cipher.id);
        this.modal = modal;

        childComponent.onSharedCipher.subscribe(async () => {
            this.modal.close();
            this.viewCipher(cipher);
            await this.ciphersComponent.refresh();
        });
        this.modal.onClosed.subscribe(async () => {
            this.modal = null;
        });
    }

    async cipherCollections(cipher: CipherView) {
        if (this.modal != null) {
            this.modal.close();
        }

        const [modal, childComponent] = await this.modalService.openViewRef(CollectionsComponent, this.collectionsModalRef,
            comp => comp.cipherId = cipher.id);
        this.modal = modal;

        childComponent.onSavedCollections.subscribe(() => {
            this.modal.close();
            this.viewCipher(cipher);
        });
        this.modal.onClosed.subscribe(async () => {
            this.modal = null;
        });
    }

    async viewCipherPasswordHistory(cipher: CipherView) {
        if (this.modal != null) {
            this.modal.close();
        }

        [this.modal] = await this.modalService.openViewRef(PasswordHistoryComponent, this.passwordHistoryModalRef,
            comp => comp.cipherId = cipher.id);

        this.modal.onClosed.subscribe(async () => {
            this.modal = null;
        });
    }

    cancelledAddEdit(cipher: CipherView) {
        this.cipherId = cipher.id;
        this.action = this.cipherId != null ? 'view' : null;
        this.go();
    }

    async clearGroupingFilters() {
        this.ciphersComponent.searchPlaceholder = this.i18nService.t('searchVault');
        await this.ciphersComponent.reload();
        this.clearFilters();
        this.go();
    }

    async filterFavorites() {
        this.ciphersComponent.searchPlaceholder = this.i18nService.t('searchFavorites');
        await this.ciphersComponent.reload(c => c.favorite);
        this.clearFilters();
        this.favorites = true;
        this.go();
    }

    async filterDeleted() {
        this.ciphersComponent.searchPlaceholder = this.i18nService.t('searchTrash');
        this.ciphersComponent.deleted = true;
        await this.ciphersComponent.reload(null, true);
        this.clearFilters();
        this.deleted = true;
        this.go();
    }

    async filterCipherType(type: CipherType) {
        this.ciphersComponent.searchPlaceholder = this.i18nService.t('searchType');
        await this.ciphersComponent.reload(c => c.type === type);
        this.clearFilters();
        this.type = type;
        this.go();
    }

    async filterFolder(folderId: string) {
        folderId = folderId === 'none' ? null : folderId;
        this.ciphersComponent.searchPlaceholder = this.i18nService.t('searchFolder');
        await this.ciphersComponent.reload(c => c.folderId === folderId);
        this.clearFilters();
        this.folderId = folderId == null ? 'none' : folderId;
        this.go();
    }

    async filterCollection(collectionId: string) {
        this.ciphersComponent.searchPlaceholder = this.i18nService.t('searchCollection');
        await this.ciphersComponent.reload(c => c.collectionIds != null &&
            c.collectionIds.indexOf(collectionId) > -1);
        this.clearFilters();
        this.collectionId = collectionId;
        this.updateCollectionProperties();
        this.go();
    }

    async openPasswordGenerator(showSelect: boolean) {
        if (this.modal != null) {
            this.modal.close();
        }

        const [modal, childComponent] = await this.modalService.openViewRef(PasswordGeneratorComponent, this.passwordGeneratorModalRef,
            comp => comp.showSelect = showSelect);
        this.modal = modal;

        childComponent.onSelected.subscribe((password: string) => {
            this.modal.close();
            if (this.addEditComponent != null && this.addEditComponent.cipher != null &&
                this.addEditComponent.cipher.type === CipherType.Login && this.addEditComponent.cipher.login != null) {
                this.addEditComponent.markPasswordAsDirty();
                this.addEditComponent.cipher.login.password = password;
            }
        });

        this.modal.onClosed.subscribe(() => {
            this.modal = null;
        });
    }

    async addFolder() {
        this.messagingService.send('newFolder');
    }

    async editFolder(folderId: string) {
        if (this.modal != null) {
            this.modal.close();
        }

        const [modal, childComponent] = await this.modalService.openViewRef(FolderAddEditComponent, this.folderAddEditModalRef,
            comp => comp.folderId = folderId);
        this.modal = modal;

        childComponent.onSavedFolder.subscribe(async (folder: FolderView) => {
            this.modal.close();
            await this.groupingsComponent.loadFolders();
        });
        childComponent.onDeletedFolder.subscribe(async (folder: FolderView) => {
            this.modal.close();
            await this.groupingsComponent.loadFolders();
        });

        this.modal.onClosed.subscribe(() => {
            this.modal = null;
        });
    }

    private dirtyInput(): boolean {
        return (this.action === 'add' || this.action === 'edit' || this.action === 'clone') &&
            document.querySelectorAll('app-vault-add-edit .ng-dirty').length > 0;
    }

    private async wantsToSaveChanges(): Promise<boolean> {
        const confirmed = await this.platformUtilsService.showDialog(
            this.i18nService.t('unsavedChangesConfirmation'), this.i18nService.t('unsavedChangesTitle'),
            this.i18nService.t('yes'), this.i18nService.t('no'), 'warning');
        return !confirmed;
    }

    private clearFilters() {
        this.folderId = null;
        this.collectionId = null;
        this.favorites = false;
        this.type = null;
        this.addCollectionIds = null;
        this.addType = null;
        this.addOrganizationId = null;
        this.deleted = false;
    }

    private go(queryParams: any = null) {
        if (queryParams == null) {
            queryParams = {
                action: this.action,
                cipherId: this.cipherId,
                favorites: this.favorites ? true : null,
                type: this.type,
                folderId: this.folderId,
                collectionId: this.collectionId,
                deleted: this.deleted ? true : null,
            };
        }

        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: queryParams,
            replaceUrl: true,
        });
    }

    private addCipherWithChangeDetection(type: CipherType = null) {
        this.functionWithChangeDetection(() => this.addCipher(type));
    }

    private copyValue(cipher: CipherView, value: string, labelI18nKey: string, aType: string) {
        this.functionWithChangeDetection(async () => {
            if (cipher.reprompt !== CipherRepromptType.None && this.passwordRepromptService.protectedFields().includes(aType) &&
               !await this.passwordRepromptService.showPasswordPrompt()) {
                return;
            }

            this.platformUtilsService.copyToClipboard(value);
            this.toasterService.popAsync('info', null,
                this.i18nService.t('valueCopied', this.i18nService.t(labelI18nKey)));
            if (this.action === 'view') {
                this.messagingService.send('minimizeOnCopy');
            }
        });
    }

    private functionWithChangeDetection(func: Function) {
        this.ngZone.run(() => {
            func();
            this.changeDetectorRef.detectChanges();
        });
    }

    private updateCollectionProperties() {
        if (this.collectionId != null) {
            const collection = this.groupingsComponent.collections.filter(c => c.id === this.collectionId);
            if (collection.length > 0) {
                this.addOrganizationId = collection[0].organizationId;
                this.addCollectionIds = [this.collectionId];
                return;
            }
        }
        this.addOrganizationId = null;
        this.addCollectionIds = null;
    }

    private async canNavigateAway(action: string, cipher?: CipherView) {
        // Don't navigate to same route
        if (this.action === action && (cipher == null || this.cipherId === cipher.id)) {
            return false;
        } else if (this.dirtyInput() && await this.wantsToSaveChanges()) {
            return false;
        }

        return true;
    }

    private async passwordReprompt(cipher: CipherView) {
        return cipher.reprompt === CipherRepromptType.None || await this.passwordRepromptService.showPasswordPrompt();
    }
}
