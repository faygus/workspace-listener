export interface FileInfos<T> {
	path: string;
	infos: T | undefined;
}

export interface IFilesRegistry<T> {
	files: FileInfos<T>[];
	getFile(path: string): FileInfos<T> | undefined;
}

export class BaseFileRegistry<T> implements IFilesRegistry<T> {
	constructor(private _filesProvider: () => FileInfos<T>[]) {

	}

	get files(): FileInfos<T>[] {
		return this._filesProvider();
	}

	getFile(path: string): FileInfos<T> | undefined {
		return this.files.find(f => f.path == path);
	}
}
