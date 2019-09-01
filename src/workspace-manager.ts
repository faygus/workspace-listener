import { FileRegister } from "./file-register";
import * as fileSystem from "./file-system";
import * as Model from "./models";
import { IFilesRegistry, BaseFileRegistry } from "./registry";
import { ISubscription } from "./subscription";

export interface IUpdateEvent {
	subscribe(handler: (path: string, content: string) => void): ISubscription;
}

export class WorkspaceFilesWatcher {
	private _registers: {
		identifier: FileIdentifier,
		register: FileRegister<any>
	}[] = [];
	private _files: Model.IFile[] = [];
	private _subscription: ISubscription;
	private _updateSubscription: ISubscription;
	private _initPromise: Promise<Model.IFile[]>;

	constructor(private _workspaceRootPath: string, private _updateEvent?: IUpdateEvent) {

	}

	async init(): Promise<void> {
		this.watch();
		this._initPromise = fileSystem.getFilesInDepthWithContent(this._workspaceRootPath);
		const files = await this._initPromise;
		for (const file of files) {
			this.parse(file);
		}
		this._files.push(...files);
	}

	registerFileType<T>(identifier: FileIdentifier, register: FileRegister<T>): IFilesRegistry<T> {
		this._registers.push({
			identifier,
			register
		});
		if (this._initPromise) {
			this._initPromise.then((files) => {
				for (const file of files) {
					if (identifier(file.path)) {
						register.register(file);
					}
				}
			});
		} else {
			for (const file of this._files) {
				if (identifier(file.path)) {
					register.register(file);
				}
			}
		}
		return new BaseFileRegistry(() => register.files);
	}

	dispose(): void {
		if (this._subscription) {
			this._subscription.close();
		}
		if (this._updateSubscription) {
			this._updateSubscription.close();
		}
	}

	private watch(): void {
		if (this._updateEvent) {
			this._updateSubscription = this._updateEvent.subscribe((path, content) => {
				this.updateFile(path, content);
			});
		}
		this._subscription = fileSystem.watchFolderInDepth(this._workspaceRootPath, async (eventType, path) => {
			if (eventType !== 'deleted') {
				const content = await fileSystem.readFile(path);
				let file = this._files.find(f => f.path === path);
				if (file) {
					file.content = content;
				} else {
					this._files.push({
						path,
						content
					});
				}
			} else {
				this._files = this._files.filter(f => f.path !== path);
			}
			const register = this.getRegister(path);
			if (!register) return;
			if (eventType === 'deleted') {
				register.remove(path);
				return;
			}
			const content = await fileSystem.readFile(path);
			register.register({
				path,
				content
			});
		});
	}

	private parse(file: Model.IFile): void {
		const register = this.getRegister(file.path);
		if (!register) return;
		register.register(file);
	}

	private getRegister(path: string): FileRegister<any> | undefined {
		const registerInfos = this._registers.find(a => a.identifier(path));
		if (!registerInfos) return undefined;
		return registerInfos.register;
	}

	private updateFile(path: string, content: string): void {
		let file = this._files.find(f => f.path === path);
		if (file) {
			file.content = content;
		} else {
			this._files.push({
				path,
				content
			});
		}
		const register = this.getRegister(path);
		if (!register) return;
		register.register({
			path,
			content
		});
	}
}

type FileIdentifier = (path: string) => boolean;