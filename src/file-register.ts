import * as Model from "./models";
import { FileInfos } from "./registry";

export class FileRegister<T> {
	files: FileInfos<T>[] = [];

	constructor(private _parse: (content: string) => T | undefined) {

	}

	register(file: Model.IFile): void {
		const infos = this.parse(file.content);
		const previousFile = this.files.find(f => f.path === file.path);
		if (previousFile) {
			previousFile.infos = infos;
		} else {
			this.files.push({
				path: file.path,
				infos
			});
		}
	}

	remove(path: string): void {
		this.files = this.files.filter(f => f.path !== path);
	}

	protected parse(content: string): T | undefined {
		return this._parse(content);
	}
}

