/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as path from 'path';
import * as objects from 'vs/base/common/objects';
import * as nls from 'vs/nls';
import URI from 'vs/base/common/uri';
import { IStateService } from 'vs/platform/state/common/state';
import { shell, screen, Rectangle, BrowserWindow, systemPreferences, app, TouchBar, nativeImage, ipcMain } from 'electron';
import { TPromise, TValueCallback } from 'vs/base/common/winjs.base';
import { IEnvironmentService, ParsedArgs } from 'vs/platform/environment/common/environment';
import { ILogService } from 'vs/platform/log/common/log';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { parseArgs } from 'vs/platform/environment/node/argv';
import product from 'vs/platform/node/product';
import { IWindowSettings, MenuBarVisibility, IWindowConfiguration, ReadyState, IRunActionInWindowRequest } from 'vs/platform/windows/common/windows';
import { IDisposable, dispose } from 'vs/base/common/lifecycle';
import { isLinux, isMacintosh, isWindows } from 'vs/base/common/platform';
import { ICodeWindow, IWindowState, WindowMode } from 'vs/platform/windows/electron-main/windows';
import { IWorkspaceIdentifier, IWorkspacesMainService } from 'vs/platform/workspaces/common/workspaces';
import { IBackupMainService } from 'vs/platform/backup/common/backup';
import { ISerializableCommandAction } from 'vs/platform/actions/common/actions';
import { mark, exportEntries } from 'vs/base/common/performance';
import { resolveMarketplaceHeaders } from 'vs/platform/extensionManagement/node/extensionGalleryService';

export interface IWindowCreationOptions {
	state: IWindowState;
	extensionDevelopmentPath?: string;
	isExtensionTestHost?: boolean;
}

export const defaultWindowState = function (mode = WindowMode.Normal): IWindowState {
	return {
		width: 1024,
		height: 768,
		mode
	};
};

interface IWorkbenchEditorConfiguration {
	workbench: {
		editor: {
			swipeToNavigate: boolean
		}
	};
}

interface ITouchBarSegment extends Electron.SegmentedControlSegment {
	id: string;
}

export class CodeWindow implements ICodeWindow {

	static readonly themeStorageKey = 'theme';
	static readonly themeBackgroundStorageKey = 'themeBackground';

	private static readonly DEFAULT_BG_LIGHT = '#FFFFFF';
	private static readonly DEFAULT_BG_DARK = '#1E1E1E';
	private static readonly DEFAULT_BG_HC_BLACK = '#000000';

	private static readonly MIN_WIDTH = 200;
	private static readonly MIN_HEIGHT = 120;

	private hiddenTitleBarStyle: boolean;
	private showTimeoutHandle: any;
	private _id: number;
	private _win: Electron.BrowserWindow;
	private _lastFocusTime: number;
	private _readyState: ReadyState;
	private windowState: IWindowState;
	private currentMenuBarVisibility: MenuBarVisibility;
	private toDispose: IDisposable[];
	private representedFilename: string;

	private _controlWin: Electron.BrowserWindow;
	private _session: any;

	private whenReadyCallbacks: TValueCallback<ICodeWindow>[];

	private currentConfig: IWindowConfiguration;
	private pendingLoadConfig: IWindowConfiguration;

	private marketplaceHeadersPromise: TPromise<object>;

	private touchBarGroups: Electron.TouchBarSegmentedControl[];

	constructor(
		config: IWindowCreationOptions,
		@ILogService private logService: ILogService,
		@IEnvironmentService private environmentService: IEnvironmentService,
		@IConfigurationService private configurationService: IConfigurationService,
		@IStateService private stateService: IStateService,
		@IWorkspacesMainService private workspacesMainService: IWorkspacesMainService,
		@IBackupMainService private backupMainService: IBackupMainService
	) {
		this.touchBarGroups = [];
		this._lastFocusTime = -1;
		this._readyState = ReadyState.NONE;
		this.whenReadyCallbacks = [];
		this.toDispose = [];

		// create browser window
		this.createBrowserWindow(config);

		// respect configured menu bar visibility
		this.onConfigurationUpdated();

		// macOS: touch bar support
		this.createTouchBar();

		// Request handling
		this.handleMarketplaceRequests();

		// Eventing
		this.registerListeners();
	}

	private createBrowserWindow(config: IWindowCreationOptions): void {

		// Load window state
		this.windowState = this.restoreWindowState(config.state);

		// in case we are maximized or fullscreen, only show later after the call to maximize/fullscreen (see below)
		const isFullscreenOrMaximized = (this.windowState.mode === WindowMode.Maximized || this.windowState.mode === WindowMode.Fullscreen);

		let backgroundColor = this.getBackgroundColor();
		if (isMacintosh && backgroundColor.toUpperCase() === CodeWindow.DEFAULT_BG_DARK) {
			backgroundColor = '#171717'; // https://github.com/electron/electron/issues/5150
		}

		const options: Electron.BrowserWindowConstructorOptions = {
			width: this.windowState.width,
			height: this.windowState.height,
			x: this.windowState.x,
			y: this.windowState.y,
			backgroundColor,
			minWidth: CodeWindow.MIN_WIDTH,
			minHeight: CodeWindow.MIN_HEIGHT,
			show: !isFullscreenOrMaximized,
			title: product.nameLong,
			fullscreen: true,
			webPreferences: {
				'backgroundThrottling': false, // by default if Code is in the background, intervals and timeouts get throttled,
				disableBlinkFeatures: 'Auxclick' // disable auxclick events (see https://developers.google.com/web/updates/2016/10/auxclick)
			}
		};

		if (isLinux) {
			options.icon = path.join(this.environmentService.appRoot, 'resources/linux/code.png'); // Windows and Mac are better off using the embedded icon(s)
		}

		const windowConfig = this.configurationService.getValue<IWindowSettings>('window');

		if (isMacintosh) {
			options.acceptFirstMouse = true; // enabled by default

			if (windowConfig && windowConfig.clickThroughInactive === false) {
				options.acceptFirstMouse = false;
			}
		}

		let useNativeTabs = false;
		if (isMacintosh && windowConfig && windowConfig.nativeTabs === true) {
			options.tabbingIdentifier = product.nameShort; // this opts in to sierra tabs
			useNativeTabs = true;
		}

		let useCustomTitleStyle = false;
		if (isMacintosh) {
			useCustomTitleStyle = !windowConfig || !windowConfig.titleBarStyle || windowConfig.titleBarStyle === 'custom'; // Default to custom on macOS

			const isDev = !this.environmentService.isBuilt || !!config.extensionDevelopmentPath;
			if (isDev) {
				useCustomTitleStyle = false; // not enabled when developing due to https://github.com/electron/electron/issues/3647
			}
		} else {
			useCustomTitleStyle = windowConfig && windowConfig.titleBarStyle === 'custom'; // Must be specified on Windows/Linux
		}

		if (useNativeTabs) {
			useCustomTitleStyle = false; // native tabs on sierra do not work with custom title style
		}

		if (useCustomTitleStyle) {
			options.titleBarStyle = 'hidden';
			this.hiddenTitleBarStyle = true;
			if (!isMacintosh) {
				options.frame = false;
			}
		}

		// Create the browser window.
		this._win = new BrowserWindow(options);
		this._id = this._win.id;

		//여기서 그러면 로그인 창을 하나 띄워보자.
		const loginWinOptions: Electron.BrowserWindowConstructorOptions = {
			parent:this._win,
			modal:true,
			width: this.windowState.width,
			height: this.windowState.height,
			x: this.windowState.x,
			y: this.windowState.y,
			fullscreen: true,
			// width: 800,
			// height: 600,
			// x: this.windowState.x,
			// y: this.windowState.y,
			// backgroundColor,
			// minWidth: CodeWindow.MIN_WIDTH,
			// minHeight: CodeWindow.MIN_HEIGHT,
			show:false,
			title: '로그인'
		};

		const controlWinOptions: Electron.BrowserWindowConstructorOptions = {
			parent:this._win,
			alwaysOnTop: true,
			width: this.windowState.width,
			height: this.windowState.height,
			x: this.windowState.x,
			y: this.windowState.y,
			// width: 800,
			// height: 600,
			// x: this.windowState.x,
			// y: this.windowState.y,
			// backgroundColor,
			// minWidth: CodeWindow.MIN_WIDTH,
			// minHeight: CodeWindow.MIN_HEIGHT,
			show:false,
			title: '로그인'
		};

		let loginWin = new BrowserWindow(loginWinOptions);
		loginWin.webContents.toggleDevTools();
		loginWin.loadURL(require.toUrl('vs/workbench/electron-browser/bootstrap/login.html'));
		loginWin.once('ready-to-show', () => {
			//child.maximize();
			//child.setFullScreen(true);
			this._session = {};
			loginWin.show();
			//this._win.hide();
		});

		loginWin.on('closed', () => {
			loginWin = null;

			if(!this._session.userId ||
				this._session.userId < 1) {
				this._win.show();
				app.quit();
			}
		});

		ipcMain.on('login-succeed', (evt, args) => {
			//자 여기서 로그인 성공했다고 치자.
			//그러면 다음은?
			//해당 학생의 학습 및 시험이 나와야 할 듯.
			//수강신청한 과목의 학습 진행도 라던지...
			//진행 예정인 시험 과목이라던지~

			this._session = args;
			loginWin.close();
			//loginWin = null;

			this._controlWin = new BrowserWindow(controlWinOptions);
			this._controlWin.webContents.toggleDevTools();
			// this._controlWin.loadURL(require.toUrl('vs/workbench/electron-browser/bootstrap/dashboard2.html'));
			this._controlWin.loadURL(require.toUrl('vs/workbench/electron-browser/bootstrap/examIndex.html'));
			this._controlWin.once('ready-to-show', () => {
				this._controlWin.show();
				this._controlWin.maximize();

				//this._controlWin.webContents.send('control-load-data', this._session.token);
				this._controlWin.webContents.send('control-exam-load', {token : this._session.token});
			});

			this._controlWin.on('closed', () => {
				this._controlWin = null;
				app.quit();
			});
		});
		ipcMain.on('login-failed', () => {
			loginWin.webContents.send('login-retry');
		});

		//vs code에서 파일 선택 변경시 이벤트 발생
		ipcMain.on('editor-selectionchanged', (evt, args) => {
			if(this._controlWin) {
				this._controlWin.webContents.send('control-someaction-reply', args);
			}
		});

		// ipcMain.on('command-showexam', (evt, args) => {
		// 	this._controlWin.loadURL(require.toUrl('vs/workbench/electron-browser/bootstrap/examIndex.html'));
		// 	this._controlWin.webContents.send('control-exam-load', {lectureId : args.lectureId, lessonId : args.lessonId, token : this._session.token});
		// });
		ipcMain.on('command-back-to-dashboard', () => {
			//this._controlWin.loadURL(require.toUrl('vs/workbench/electron-browser/bootstrap/dashboard2.html'));
			this._controlWin.loadURL(require.toUrl('vs/workbench/electron-browser/bootstrap/examIndex.html'));
			let _controlWin = this._controlWin;
			let _session = this._session;
			this._controlWin.webContents.on('did-finish-load', function() {
				//_controlWin.webContents.send('control-load-data', _session.token);
				_controlWin.webContents.send('control-exam-load', {token : _session.token});
			});
		});

		//제어 윈도우에서 vs code를 열 때...
		//this._win.show(); 이거를 실행해줘야 함.

		// let directory = '';

		// ipcMain.on('command-downloadExamSample', (evt, info) => {

		// 	directory = info.to;
		// 	download(this._controlWin, info.url, {directory:directory})
		// 		.then(dl => {
		// 			let filepath = dl.getSavePath();
		// 			let filename = path.parse(filepath).base;

		// 			if(filename.indexOf('.zip') > 0) {
		// 				//압축풀기
		// 				let zip1 = new admzip(filepath);
		// 				zip1.extractAllTo(path.join(directory, filename), false);
		// 			}

		// 			this._controlWin.webContents.send('downloadExamSample-complete', dl.getSavePath());

		// 			//압축하기
		// 			// let zip = new admzip();
		// 			// zip.addLocalFolder(directory);
		// 			// zip.writeZip(path.join(directory, "files.zip"));
		// 		});
		// })

		//제어 윈도우 위치 조절
		ipcMain.on('command-controlwindow-lefttop', () => {
			if(this._controlWin) {
				//일단은 display.bounds를 이용해서 현재 윈도우가 어느 모니터에 있는지 확인을 하고, 그 모니터 한도 내에서 위치를 지정한다.
				let bounds = this.getCurrentDisplayBounds();
				this._controlWin.setPosition(bounds.x, bounds.y, true);
			}
		});
		ipcMain.on('command-controlwindow-leftbottom', () => {
			if(this._controlWin) {
				//일단은 display.bounds를 이용해서 현재 윈도우가 어느 모니터에 있는지 확인을 하고, 그 모니터 한도 내에서 위치를 지정한다.
				let bounds = this.getCurrentDisplayBounds();

				let y = ((bounds.y + bounds.height) - this._controlWin.getSize()[1]) - 45;

				this._controlWin.setPosition(bounds.x, y, true);
			}
		});
		ipcMain.on('command-controlwindow-righttop', () => {
			if(this._controlWin) {
				//일단은 display.bounds를 이용해서 현재 윈도우가 어느 모니터에 있는지 확인을 하고, 그 모니터 한도 내에서 위치를 지정한다.
				let bounds = this.getCurrentDisplayBounds();

				let x = ((bounds.x + bounds.width) - this._controlWin.getSize()[0]);

				this._controlWin.setPosition(x, bounds.y, true);
			}
		});
		ipcMain.on('command-controlwindow-rightbottom', () => {
			if(this._controlWin) {
				//일단은 display.bounds를 이용해서 현재 윈도우가 어느 모니터에 있는지 확인을 하고, 그 모니터 한도 내에서 위치를 지정한다.
				let bounds = this.getCurrentDisplayBounds();

				let x = ((bounds.x + bounds.width) - this._controlWin.getSize()[0]);
				let y = ((bounds.y + bounds.height) - this._controlWin.getSize()[1]) - 45;

				this._controlWin.setPosition(x, y, true);
			}
		});

		//vs code 포커스 인 & 아웃 감지
		this._win.on('blur', () => {
			if(this._controlWin) {
				if(this._controlWin.isFocused() === false) {
					this._controlWin.webContents.send('vscode-focused-out');
				}
			}
		});
		this._win.on('focus', () => {
			if(this._controlWin) {
				if(this._controlWin.isFocused() === false) {
					this._controlWin.webContents.send('vscode-focused-in');
				}
			}
		});

		// ipcMain.on('control-someaction', () => {
		// 	this._controlWin.webContents.send('control-someaction-reply');
		// });

		if (useCustomTitleStyle) {
			this._win.setSheetOffset(22); // offset dialogs by the height of the custom title bar if we have any
		}

		if (isFullscreenOrMaximized) {
			this._win.maximize();

			if (this.windowState.mode === WindowMode.Fullscreen) {
				this._win.setFullScreen(true);
			}

			if (!this._win.isVisible()) {
				// this._win.show(); // to reduce flicker from the default window size to maximize, we only show after maximize
			}
		}

		this._lastFocusTime = Date.now(); // since we show directly, we need to set the last focus time too
	}

	hasHiddenTitleBarStyle(): boolean {
		return this.hiddenTitleBarStyle;
	}

	get isExtensionDevelopmentHost(): boolean {
		return !!this.config.extensionDevelopmentPath;
	}

	get isExtensionTestHost(): boolean {
		return !!this.config.extensionTestsPath;
	}

	get extensionDevelopmentPath(): string {
		return this.config.extensionDevelopmentPath;
	}

	get config(): IWindowConfiguration {
		return this.currentConfig;
	}

	get id(): number {
		return this._id;
	}

	get win(): Electron.BrowserWindow {
		return this._win;
	}

	setRepresentedFilename(filename: string): void {
		if (isMacintosh) {
			this.win.setRepresentedFilename(filename);
		} else {
			this.representedFilename = filename;
		}
	}

	getRepresentedFilename(): string {
		if (isMacintosh) {
			return this.win.getRepresentedFilename();
		}

		return this.representedFilename;
	}

	focus(): void {
		if (!this._win) {
			return;
		}

		if (this._win.isMinimized()) {
			this._win.restore();
		}

		this._win.focus();
	}

	get lastFocusTime(): number {
		return this._lastFocusTime;
	}

	get backupPath(): string {
		return this.currentConfig ? this.currentConfig.backupPath : void 0;
	}

	get openedWorkspace(): IWorkspaceIdentifier {
		return this.currentConfig ? this.currentConfig.workspace : void 0;
	}

	get openedFolderUri(): URI {
		return this.currentConfig ? this.currentConfig.folderUri : void 0;
	}

	setReady(): void {
		this._readyState = ReadyState.READY;

		// inform all waiting promises that we are ready now
		while (this.whenReadyCallbacks.length) {
			this.whenReadyCallbacks.pop()(this);
		}
	}

	ready(): TPromise<ICodeWindow> {
		return new TPromise<ICodeWindow>((c) => {
			if (this._readyState === ReadyState.READY) {
				return c(this);
			}

			// otherwise keep and call later when we are ready
			this.whenReadyCallbacks.push(c);
		});
	}

	get readyState(): ReadyState {
		return this._readyState;
	}

	private getCurrentDisplayBounds(): Rectangle {
		let bounds = null;

		let pos = this._controlWin.getPosition();
		let size = this._controlWin.getSize();
		let display = screen.getDisplayMatching({x:pos[0], y:pos[1], width:size[0], height:size[1]});

		bounds = display.bounds;
		return bounds;
	}

	private handleMarketplaceRequests(): void {

		// Resolve marketplace headers
		this.marketplaceHeadersPromise = resolveMarketplaceHeaders(this.environmentService);

		// Inject headers when requests are incoming
		const urls = ['https://marketplace.visualstudio.com/*', 'https://*.vsassets.io/*'];
		this._win.webContents.session.webRequest.onBeforeSendHeaders({ urls }, (details: any, cb: any) => {
			this.marketplaceHeadersPromise.done(headers => {
				cb({ cancel: false, requestHeaders: objects.assign(details.requestHeaders, headers) });
			});
		});
	}

	private registerListeners(): void {

		// Prevent loading of svgs
		this._win.webContents.session.webRequest.onBeforeRequest(null, (details, callback) => {
			if (details.url.indexOf('.svg') > 0) {
				const uri = URI.parse(details.url);
				if (uri && !uri.scheme.match(/file/i) && (uri.path as any).endsWith('.svg')) {
					return callback({ cancel: true });
				}
			}

			return callback({});
		});

		this._win.webContents.session.webRequest.onHeadersReceived(null, (details: any, callback: any) => {
			const contentType: string[] = (details.responseHeaders['content-type'] || details.responseHeaders['Content-Type']) as any;
			if (contentType && Array.isArray(contentType) && contentType.some(x => x.toLowerCase().indexOf('image/svg') >= 0)) {
				return callback({ cancel: true });
			}

			return callback({ cancel: false, responseHeaders: details.responseHeaders });
		});

		// Remember that we loaded
		this._win.webContents.on('did-finish-load', () => {
			this._readyState = ReadyState.LOADING;

			// Associate properties from the load request if provided
			if (this.pendingLoadConfig) {
				this.currentConfig = this.pendingLoadConfig;

				this.pendingLoadConfig = null;
			}

			// To prevent flashing, we set the window visible after the page has finished to load but before Code is loaded
			if (this._win && !this._win.isVisible()) {
				if (this.windowState.mode === WindowMode.Maximized) {
					this._win.maximize();
				}

				if (!this._win.isVisible()) { // maximize also makes visible
					//this._win.show();
				}
			}
		});

		// App commands support
		this.registerNavigationListenerOn('app-command', 'browser-backward', 'browser-forward', false);

		// Handle code that wants to open links
		this._win.webContents.on('new-window', (event: Event, url: string) => {
			event.preventDefault();

			shell.openExternal(url);
		});

		// Window Focus
		this._win.on('focus', () => {
			this._lastFocusTime = Date.now();
		});

		// Window (Un)Maximize
		this._win.on('maximize', (e) => {
			if (this.currentConfig) {
				this.currentConfig.maximized = true;
			}

			app.emit('browser-window-maximize', e, this._win);
		});

		this._win.on('unmaximize', (e) => {
			if (this.currentConfig) {
				this.currentConfig.maximized = false;
			}

			app.emit('browser-window-unmaximize', e, this._win);
		});

		// Window Fullscreen
		this._win.on('enter-full-screen', () => {
			this.sendWhenReady('vscode:enterFullScreen');
		});

		this._win.on('leave-full-screen', () => {
			this.sendWhenReady('vscode:leaveFullScreen');
		});

		// Window Failed to load
		this._win.webContents.on('did-fail-load', (event: Electron.Event, errorCode: number, errorDescription: string, validatedURL: string, isMainFrame: boolean) => {
			this.logService.warn('[electron event]: fail to load, ', errorDescription);
		});

		// Prevent any kind of navigation triggered by the user!
		// But do not touch this in dev version because it will prevent "Reload" from dev tools
		if (this.environmentService.isBuilt) {
			this._win.webContents.on('will-navigate', (event: Event) => {
				if (event) {
					event.preventDefault();
				}
			});
		}

		// Handle configuration changes
		this.toDispose.push(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated()));

		// Handle Workspace events
		this.toDispose.push(this.workspacesMainService.onUntitledWorkspaceDeleted(e => this.onUntitledWorkspaceDeleted(e)));

		// TODO@Ben workaround for https://github.com/Microsoft/vscode/issues/13612
		// It looks like smooth scrolling disappears as soon as the window is minimized
		// and maximized again. Touching some window properties "fixes" it, like toggling
		// the visibility of the menu.
		if (isWindows) {
			const windowConfig = this.configurationService.getValue<IWindowSettings>('window');
			if (windowConfig && windowConfig.smoothScrollingWorkaround === true) {
				let minimized = false;

				const restoreSmoothScrolling = () => {
					if (minimized) {
						const visibility = this.getMenuBarVisibility();
						const temporaryVisibility: MenuBarVisibility = (visibility === 'hidden' || visibility === 'toggle') ? 'default' : 'hidden';
						setTimeout(() => {
							this.doSetMenuBarVisibility(temporaryVisibility);
							this.doSetMenuBarVisibility(visibility);
						}, 0);
					}

					minimized = false;
				};

				this._win.on('minimize', () => minimized = true);
				this._win.on('restore', () => restoreSmoothScrolling());
				this._win.on('maximize', () => restoreSmoothScrolling());
			}
		}
	}

	private onUntitledWorkspaceDeleted(workspace: IWorkspaceIdentifier): void {

		// Make sure to update our workspace config if we detect that it
		// was deleted
		if (this.openedWorkspace && this.openedWorkspace.id === workspace.id) {
			this.currentConfig.workspace = void 0;
		}
	}

	private onConfigurationUpdated(): void {
		const newMenuBarVisibility = this.getMenuBarVisibility();
		if (newMenuBarVisibility !== this.currentMenuBarVisibility) {
			this.currentMenuBarVisibility = newMenuBarVisibility;
			this.setMenuBarVisibility(newMenuBarVisibility);
		}

		// Swipe command support (macOS)
		if (isMacintosh) {
			const config = this.configurationService.getValue<IWorkbenchEditorConfiguration>();
			if (config && config.workbench && config.workbench.editor && config.workbench.editor.swipeToNavigate) {
				this.registerNavigationListenerOn('swipe', 'left', 'right', true);
			} else {
				this._win.removeAllListeners('swipe');
			}
		}
	}

	private registerNavigationListenerOn(command: 'swipe' | 'app-command', back: 'left' | 'browser-backward', forward: 'right' | 'browser-forward', acrossEditors: boolean) {
		this._win.on(command as 'swipe' /* | 'app-command' */, (e: Electron.Event, cmd: string) => {
			if (this.readyState !== ReadyState.READY) {
				return; // window must be ready
			}

			if (cmd === back) {
				this.send('vscode:runAction', { id: acrossEditors ? 'workbench.action.openPreviousRecentlyUsedEditor' : 'workbench.action.navigateBack', from: 'mouse' } as IRunActionInWindowRequest);
			} else if (cmd === forward) {
				this.send('vscode:runAction', { id: acrossEditors ? 'workbench.action.openNextRecentlyUsedEditor' : 'workbench.action.navigateForward', from: 'mouse' } as IRunActionInWindowRequest);
			}
		});
	}

	load(config: IWindowConfiguration, isReload?: boolean, disableExtensions?: boolean): void {

		// If this is the first time the window is loaded, we associate the paths
		// directly with the window because we assume the loading will just work
		if (this.readyState === ReadyState.NONE) {
			this.currentConfig = config;
		}

		// Otherwise, the window is currently showing a folder and if there is an
		// unload handler preventing the load, we cannot just associate the paths
		// because the loading might be vetoed. Instead we associate it later when
		// the window load event has fired.
		else {
			this.pendingLoadConfig = config;
			this._readyState = ReadyState.NAVIGATING;
		}

		// Add disable-extensions to the config, but do not preserve it on currentConfig or
		// pendingLoadConfig so that it is applied only on this load
		const configuration = objects.assign({}, config);
		if (disableExtensions !== undefined) {
			configuration['disable-extensions'] = disableExtensions;
		}

		// Clear Document Edited if needed
		if (isMacintosh && this._win.isDocumentEdited()) {
			if (!isReload || !this.backupMainService.isHotExitEnabled()) {
				this._win.setDocumentEdited(false);
			}
		}

		// Clear Title and Filename if needed
		if (!isReload) {
			if (this.getRepresentedFilename()) {
				this.setRepresentedFilename('');
			}

			this._win.setTitle(product.nameLong);
		}

		// Load URL
		mark('main:loadWindow');
		this._win.loadURL(this.getUrl(configuration));

		// Make window visible if it did not open in N seconds because this indicates an error
		// Only do this when running out of sources and not when running tests
		if (!this.environmentService.isBuilt && !this.environmentService.extensionTestsPath) {
			this.showTimeoutHandle = setTimeout(() => {
				if (this._win && !this._win.isVisible() && !this._win.isMinimized()) {
					// this._win.show();
					// this._win.focus();
					// this._win.webContents.openDevTools();
				}
			}, 10000);
		}
	}

	reload(configuration?: IWindowConfiguration, cli?: ParsedArgs): void {

		// If config is not provided, copy our current one
		if (!configuration) {
			configuration = objects.mixin({}, this.currentConfig);
		}

		// Delete some properties we do not want during reload
		delete configuration.filesToOpen;
		delete configuration.filesToCreate;
		delete configuration.filesToDiff;
		delete configuration.filesToWait;

		// Some configuration things get inherited if the window is being reloaded and we are
		// in extension development mode. These options are all development related.
		if (this.isExtensionDevelopmentHost && cli) {
			configuration.verbose = cli.verbose;
			configuration.debugPluginHost = cli.debugPluginHost;
			configuration.debugBrkPluginHost = cli.debugBrkPluginHost;
			configuration.debugId = cli.debugId;
			configuration['extensions-dir'] = cli['extensions-dir'];
		}

		configuration.isInitialStartup = false; // since this is a reload

		// Load config
		const disableExtensions = cli ? cli['disable-extensions'] : undefined;
		this.load(configuration, true, disableExtensions);
	}

	private getUrl(windowConfiguration: IWindowConfiguration): string {

		// Set window ID
		windowConfiguration.windowId = this._win.id;
		windowConfiguration.logLevel = this.logService.getLevel();

		// Set zoomlevel
		const windowConfig = this.configurationService.getValue<IWindowSettings>('window');
		const zoomLevel = windowConfig && windowConfig.zoomLevel;
		if (typeof zoomLevel === 'number') {
			windowConfiguration.zoomLevel = zoomLevel;
		}

		// Set fullscreen state
		windowConfiguration.fullscreen = this._win.isFullScreen();

		// Set Accessibility Config
		let autoDetectHighContrast = true;
		if (windowConfig && windowConfig.autoDetectHighContrast === false) {
			autoDetectHighContrast = false;
		}
		windowConfiguration.highContrast = isWindows && autoDetectHighContrast && systemPreferences.isInvertedColorScheme();
		windowConfiguration.accessibilitySupport = app.isAccessibilitySupportEnabled();

		// Theme
		windowConfiguration.baseTheme = this.getBaseTheme();
		windowConfiguration.backgroundColor = this.getBackgroundColor();

		// Title style related
		windowConfiguration.maximized = this._win.isMaximized();
		windowConfiguration.frameless = this.hasHiddenTitleBarStyle() && !isMacintosh;

		// Perf Counters
		windowConfiguration.perfEntries = exportEntries();
		windowConfiguration.perfStartTime = (<any>global).perfStartTime;
		windowConfiguration.perfWindowLoadTime = Date.now();

		// Config (combination of process.argv and window configuration)
		const environment = parseArgs(process.argv);
		const config = objects.assign(environment, windowConfiguration);
		for (let key in config) {
			if (config[key] === void 0 || config[key] === null || config[key] === '') {
				delete config[key]; // only send over properties that have a true value
			}
		}

		return `${require.toUrl('vs/workbench/electron-browser/bootstrap/index.html')}?config=${encodeURIComponent(JSON.stringify(config))}`;
	}

	private getBaseTheme(): string {
		if (isWindows && systemPreferences.isInvertedColorScheme()) {
			return 'hc-black';
		}

		const theme = this.stateService.getItem<string>(CodeWindow.themeStorageKey, 'vs-dark');

		return theme.split(' ')[0];
	}

	private getBackgroundColor(): string {
		if (isWindows && systemPreferences.isInvertedColorScheme()) {
			return CodeWindow.DEFAULT_BG_HC_BLACK;
		}

		const background = this.stateService.getItem<string>(CodeWindow.themeBackgroundStorageKey, null);
		if (!background) {
			const baseTheme = this.getBaseTheme();

			return baseTheme === 'hc-black' ? CodeWindow.DEFAULT_BG_HC_BLACK : (baseTheme === 'vs' ? CodeWindow.DEFAULT_BG_LIGHT : CodeWindow.DEFAULT_BG_DARK);
		}

		return background;
	}

	serializeWindowState(): IWindowState {
		if (!this._win) {
			return defaultWindowState();
		}

		// fullscreen gets special treatment
		if (this._win.isFullScreen()) {
			const display = screen.getDisplayMatching(this.getBounds());

			return {
				mode: WindowMode.Fullscreen,
				display: display ? display.id : void 0,

				// still carry over window dimensions from previous sessions!
				width: this.windowState.width,
				height: this.windowState.height,
				x: this.windowState.x,
				y: this.windowState.y
			};
		}

		const state: IWindowState = Object.create(null);
		let mode: WindowMode;

		// get window mode
		if (!isMacintosh && this._win.isMaximized()) {
			mode = WindowMode.Maximized;
		} else {
			mode = WindowMode.Normal;
		}

		// we don't want to save minimized state, only maximized or normal
		if (mode === WindowMode.Maximized) {
			state.mode = WindowMode.Maximized;
		} else {
			state.mode = WindowMode.Normal;
		}

		// only consider non-minimized window states
		if (mode === WindowMode.Normal || mode === WindowMode.Maximized) {
			const bounds = this.getBounds();

			state.x = bounds.x;
			state.y = bounds.y;
			state.width = bounds.width;
			state.height = bounds.height;
		}

		return state;
	}

	private restoreWindowState(state?: IWindowState): IWindowState {
		if (state) {
			try {
				state = this.validateWindowState(state);
			} catch (err) {
				this.logService.warn(`Unexpected error validating window state: ${err}\n${err.stack}`); // somehow display API can be picky about the state to validate
			}
		}

		if (!state) {
			state = defaultWindowState();
		}

		return state;
	}

	private validateWindowState(state: IWindowState): IWindowState {
		if (!state) {
			return null;
		}

		if ([state.x, state.y, state.width, state.height].some(n => typeof n !== 'number')) {
			return null;
		}

		if (state.width <= 0 || state.height <= 0) {
			return null;
		}

		const displays = screen.getAllDisplays();

		// Single Monitor: be strict about x/y positioning
		if (displays.length === 1) {
			const displayBounds = displays[0].bounds;

			// Careful with maximized: in that mode x/y can well be negative!
			if (state.mode !== WindowMode.Maximized && displayBounds.width > 0 && displayBounds.height > 0 /* Linux X11 sessions sometimes report wrong display bounds */) {
				if (state.x < displayBounds.x) {
					state.x = displayBounds.x; // prevent window from falling out of the screen to the left
				}

				if (state.y < displayBounds.y) {
					state.y = displayBounds.y; // prevent window from falling out of the screen to the top
				}

				if (state.x > (displayBounds.x + displayBounds.width)) {
					state.x = displayBounds.x; // prevent window from falling out of the screen to the right
				}

				if (state.y > (displayBounds.y + displayBounds.height)) {
					state.y = displayBounds.y; // prevent window from falling out of the screen to the bottom
				}

				if (state.width > displayBounds.width) {
					state.width = displayBounds.width; // prevent window from exceeding display bounds width
				}

				if (state.height > displayBounds.height) {
					state.height = displayBounds.height; // prevent window from exceeding display bounds height
				}
			}

			if (state.mode === WindowMode.Maximized) {
				return defaultWindowState(WindowMode.Maximized); // when maximized, make sure we have good values when the user restores the window
			}

			return state;
		}

		// Multi Montior (fullscreen): try to find the previously used display
		if (state.display && state.mode === WindowMode.Fullscreen) {
			const display = displays.filter(d => d.id === state.display)[0];
			if (display && display.bounds && typeof display.bounds.x === 'number' && typeof display.bounds.y === 'number') {
				const defaults = defaultWindowState(WindowMode.Fullscreen); // make sure we have good values when the user restores the window
				defaults.x = display.bounds.x; // carefull to use displays x/y position so that the window ends up on the correct monitor
				defaults.y = display.bounds.y;

				return defaults;
			}
		}

		// Multi Monitor (non-fullscreen): be less strict because metrics can be crazy
		const bounds = { x: state.x, y: state.y, width: state.width, height: state.height };
		const display = screen.getDisplayMatching(bounds);
		if (
			display &&												// we have a display matching the desired bounds
			bounds.x < display.bounds.x + display.bounds.width &&	// prevent window from falling out of the screen to the right
			bounds.y < display.bounds.y + display.bounds.height &&	// prevent window from falling out of the screen to the bottom
			bounds.x + bounds.width > display.bounds.x &&			// prevent window from falling out of the screen to the left
			bounds.y + bounds.height > display.bounds.y				// prevent window from falling out of the scree nto the top
		) {
			if (state.mode === WindowMode.Maximized) {
				const defaults = defaultWindowState(WindowMode.Maximized); // when maximized, make sure we have good values when the user restores the window
				defaults.x = state.x; // carefull to keep x/y position so that the window ends up on the correct monitor
				defaults.y = state.y;

				return defaults;
			}

			return state;
		}

		return null;
	}

	getBounds(): Electron.Rectangle {
		const pos = this._win.getPosition();
		const dimension = this._win.getSize();

		return { x: pos[0], y: pos[1], width: dimension[0], height: dimension[1] };
	}

	toggleFullScreen(): void {
		const willBeFullScreen = !this._win.isFullScreen();

		// set fullscreen flag on window
		this._win.setFullScreen(willBeFullScreen);

		// respect configured menu bar visibility or default to toggle if not set
		this.setMenuBarVisibility(this.currentMenuBarVisibility, false);
	}

	private getMenuBarVisibility(): MenuBarVisibility {
		const windowConfig = this.configurationService.getValue<IWindowSettings>('window');
		if (!windowConfig || !windowConfig.menuBarVisibility) {
			return 'default';
		}

		let menuBarVisibility = windowConfig.menuBarVisibility;
		if (['visible', 'toggle', 'hidden'].indexOf(menuBarVisibility) < 0) {
			menuBarVisibility = 'default';
		}

		return menuBarVisibility;
	}

	private setMenuBarVisibility(visibility: MenuBarVisibility, notify: boolean = true): void {
		if (isMacintosh) {
			return; // ignore for macOS platform
		}

		if (visibility === 'toggle') {
			if (notify) {
				this.send('vscode:showInfoMessage', nls.localize('hiddenMenuBar', "You can still access the menu bar by pressing the Alt-key."));
			}
		}

		if (visibility === 'hidden') {
			// for some weird reason that I have no explanation for, the menu bar is not hiding when calling
			// this without timeout (see https://github.com/Microsoft/vscode/issues/19777). there seems to be
			// a timing issue with us opening the first window and the menu bar getting created. somehow the
			// fact that we want to hide the menu without being able to bring it back via Alt key makes Electron
			// still show the menu. Unable to reproduce from a simple Hello World application though...
			setTimeout(() => {
				this.doSetMenuBarVisibility(visibility);
			});
		} else {
			this.doSetMenuBarVisibility(visibility);
		}
	}

	private doSetMenuBarVisibility(visibility: MenuBarVisibility): void {
		const isFullscreen = this._win.isFullScreen();

		switch (visibility) {
			case ('default'):
				this._win.setMenuBarVisibility(!isFullscreen);
				this._win.setAutoHideMenuBar(isFullscreen);
				break;

			case ('visible'):
				this._win.setMenuBarVisibility(true);
				this._win.setAutoHideMenuBar(false);
				break;

			case ('toggle'):
				this._win.setMenuBarVisibility(false);
				this._win.setAutoHideMenuBar(true);
				break;

			case ('hidden'):
				this._win.setMenuBarVisibility(false);
				this._win.setAutoHideMenuBar(false);
				break;
		}
	}

	onWindowTitleDoubleClick(): void {

		// Respect system settings on mac with regards to title click on windows title
		if (isMacintosh) {
			const action = systemPreferences.getUserDefault('AppleActionOnDoubleClick', 'string');
			switch (action) {
				case 'Minimize':
					this.win.minimize();
					break;
				case 'None':
					break;
				case 'Maximize':
				default:
					this.win.maximize();
			}
		}

		// Linux/Windows: just toggle maximize/minimized state
		else {
			if (this.win.isMaximized()) {
				this.win.unmaximize();
			} else {
				this.win.maximize();
			}
		}
	}

	close(): void {
		if (this._win) {
			this._win.close();
		}
	}

	sendWhenReady(channel: string, ...args: any[]): void {
		this.ready().then(() => {
			this.send(channel, ...args);
		});
	}

	send(channel: string, ...args: any[]): void {
		if (this._win) {
			this._win.webContents.send(channel, ...args);
		}
	}

	updateTouchBar(groups: ISerializableCommandAction[][]): void {
		if (!isMacintosh) {
			return; // only supported on macOS
		}

		// Update segments for all groups. Setting the segments property
		// of the group directly prevents ugly flickering from happening
		this.touchBarGroups.forEach((touchBarGroup, index) => {
			const commands = groups[index];
			touchBarGroup.segments = this.createTouchBarGroupSegments(commands);
		});
	}

	private createTouchBar(): void {
		if (!isMacintosh) {
			return; // only supported on macOS
		}

		// To avoid flickering, we try to reuse the touch bar group
		// as much as possible by creating a large number of groups
		// for reusing later.
		for (let i = 0; i < 10; i++) {
			const groupTouchBar = this.createTouchBarGroup();
			this.touchBarGroups.push(groupTouchBar);
		}

		this._win.setTouchBar(new TouchBar({ items: this.touchBarGroups }));
	}

	private createTouchBarGroup(items: ISerializableCommandAction[] = []): Electron.TouchBarSegmentedControl {

		// Group Segments
		const segments = this.createTouchBarGroupSegments(items);

		// Group Control
		const control = new TouchBar.TouchBarSegmentedControl({
			segments,
			mode: 'buttons',
			segmentStyle: 'automatic',
			change: (selectedIndex) => {
				this.sendWhenReady('vscode:runAction', { id: (control.segments[selectedIndex] as ITouchBarSegment).id, from: 'touchbar' });
			}
		});

		return control;
	}

	private createTouchBarGroupSegments(items: ISerializableCommandAction[] = []): ITouchBarSegment[] {
		const segments: ITouchBarSegment[] = items.map(item => {
			let icon: Electron.NativeImage;
			if (item.iconLocation && item.iconLocation.dark.scheme === 'file') {
				icon = nativeImage.createFromPath(URI.revive(item.iconLocation.dark).fsPath);
				if (icon.isEmpty()) {
					icon = void 0;
				}
			}

			return {
				id: item.id,
				label: !icon ? item.title as string : void 0,
				icon
			};
		});

		return segments;
	}

	dispose(): void {
		if (this.showTimeoutHandle) {
			clearTimeout(this.showTimeoutHandle);
		}

		this.toDispose = dispose(this.toDispose);

		this._win = null; // Important to dereference the window object to allow for GC
	}
}
