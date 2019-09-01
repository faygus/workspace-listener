import * as path from "path";
import { FileRegister, WorkspaceFilesWatcher } from "../src";

const folderPath = '/Users/j-sdurier/Documents/trash';

const viewFileRegister = new FileRegister((data: string) => {
	return { toto: data };
});
const otherFileRegister = new FileRegister((data: string) => data);


const watcher = new WorkspaceFilesWatcher(folderPath);
watcher.registerFileType(filePath => {
	return path.extname(filePath) === '.aml';
}, viewFileRegister);
watcher.registerFileType(filePath => {
	return path.extname(filePath) !== '.aml';
}, otherFileRegister);
watcher.init().then(() => {
	console.log('view files : ');
	console.log(viewFileRegister.files);
	/*console.log('other files : ');
	console.log(otherFileRegister.files);*/
});
