import * as path from "path";

export class Workspace {
	constructor(public rootFolder: Folder) {

	}
}

export abstract class FileOrFolder {
	constructor(public name: string,
		public id: number,
		public parentFolder: Folder | undefined) {

	}

	get path(): string {
		if (!this.parentFolder) {
			return this.name;
		}
		return path.join(this.parentFolder.path, this.name);
	}
}

export class Folder extends FileOrFolder {
	folders: Folder[] = [];
	files: File[] = [];

	loopInFiles(handler: (file: File) => void): void {
		for (const file of this.files) {
			handler(file);
		}
		for (const folder of this.folders) {
			folder.loopInFiles(handler);
		}
	}

	addFolder(folder: Folder): void {
		folder.parentFolder = this;
		this.folders.push(folder);
	}

	addFile(file: File): void {
		file.parentFolder = this;
		this.files.push(file);
	}
}

export class File extends FileOrFolder {
	constructor(name: string,
		id: number,
		parentFolder: Folder | undefined,
		public content: string) {
		super(name, id, parentFolder);
	}
}
