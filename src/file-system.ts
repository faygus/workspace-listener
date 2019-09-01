import * as fs from "fs";
import * as path from "path";
import { IFile } from "./models/i-file";
import { ISubscription } from "./subscription";

type FileEventHandler = (eventType: 'created' | 'deleted', path: string) => void;

export function watchFiles(folderPath: string, handler: FileEventHandler): ISubscription {
	const subscription = fs.watch(folderPath, (eventType, fileName) => {
		const filePath = path.join(folderPath, fileName);
		if (eventType !== 'rename') {
			return;
		}
		if (fs.existsSync(filePath)) {
			handler('created', filePath)
		} else {
			handler('deleted', filePath);
		}
	});
	return {
		close() {
			subscription.close();
		}
	};
}

export function watchFolderInDepth(folderPath: string,
	handler: FileEventHandler): ISubscription {
	const subscriptions: { [path: string]: ISubscription } = {};
	const watcher = (folderPath: string) => {
		return watchFiles(folderPath, (eventType, filePath) => {
			if (eventType === 'deleted') {
				for (const p of Object.keys(subscriptions)) {
					const relative = path.relative(filePath, p);
					if ((relative && !relative.startsWith('..') && !path.isAbsolute(relative)) ||
						p === filePath) {
						if (subscriptions[p]) {
							subscriptions[p].close();
							delete subscriptions[p];
						}
					}

				}
			} else if (fs.statSync(filePath).isDirectory()) {
				subscriptions[filePath] = watcher(filePath)
			}
			handler(eventType, filePath);
		});
	};
	subscriptions[folderPath] = watcher(folderPath);
	getFoldersInDepth(folderPath).then(folders => {
		for (const folder of folders) {
			subscriptions[folder] = watcher(folder);
		}
	});
	return {
		close() {
			for (const path of Object.keys(subscriptions)) {
				subscriptions[path].close();
			}
		}
	};
}

function getFilesInFolder(directoryPath: string): Promise<string[]> {
	return new Promise<string[]>((resolve, reject) => {
		fs.readdir(directoryPath, (err, files) => {
			if (err) {
				return reject('Unable to scan directory: ' + err);
			}
			return resolve(files.map(file => path.join(directoryPath, file)));
		});
	});
}

export async function getFilesInDepth(directoryPath: string): Promise<string[]> {
	const res: string[] = [];
	const files = await getFilesInFolder(directoryPath);
	const promises: Promise<string[]>[] = [];
	for (const file of files) {
		const stats = fs.statSync(file);
		if (stats.isFile()) {
			res.push(file);
		} else {
			promises.push(getFilesInDepth(file));
		}
	}
	const values = await Promise.all(promises);
	res.push(...values.reduce((a, b) => {
		return [...a, ...b];
	}, []));
	return res;
}

export async function getFoldersInDepth(directoryPath: string): Promise<string[]> {
	const res: string[] = [];
	const files = await getFilesInFolder(directoryPath);
	const promises: Promise<string[]>[] = [];
	for (const file of files) {
		const stats = fs.statSync(file);
		if (stats.isDirectory()) {
			res.push(file);
			promises.push(getFoldersInDepth(file));
		}
	}
	const values = await Promise.all(promises);
	res.push(...values.reduce((a, b) => {
		return [...a, ...b];
	}, []));
	return res;
}

export async function getFilesInDepthWithContent(directoryPath: string): Promise<IFile[]> {
	const files = await getFilesInDepth(directoryPath);
	return Promise.all(files.map(file => new Promise<IFile>((resolve, reject) => {
		fs.readFile(file, 'utf8', (err, data) => {
			if (err) {
				return reject(err);
			}
			return resolve({
				path: file,
				content: data
			});
		});
	})));
}

export async function readFile(path: string): Promise<string> {
	return fs.readFileSync(path, {
		encoding: 'utf8'
	});
}
