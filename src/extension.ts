import * as vscode from 'vscode';
import { browseChangedFilesBetweenRefs } from './commands/browseChangedFiles';
import {
	compareActiveFileBetweenRefs,
	compareActiveFileWithRef,
} from './commands/compareActiveFile';
import { registerEmptyDocumentProvider } from './git/emptyDocument';

async function runCommand(command: () => Promise<void>): Promise<void> {
	try {
		await command();
	} catch (error) {
		const message = error instanceof Error ? error.message : 'An unexpected error occurred.';

		await vscode.window.showErrorMessage(message);
	}
}

export function activate(context: vscode.ExtensionContext): void {
	console.log('Git Compare Ref Open extension is now active.');
	context.subscriptions.push(
		registerEmptyDocumentProvider(),
		vscode.commands.registerCommand(
			'git-compare-ref-open.compareActiveFileCurrentRight',
			() => runCommand(() => compareActiveFileWithRef('right')),
		),
		vscode.commands.registerCommand(
			'git-compare-ref-open.compareActiveFileCurrentLeft',
			() => runCommand(() => compareActiveFileWithRef('left')),
		),
		vscode.commands.registerCommand(
			'git-compare-ref-open.compareActiveFileBetweenRefs',
			() => runCommand(() => compareActiveFileBetweenRefs()),
		),
		vscode.commands.registerCommand(
			'git-compare-ref-open.browseChangedFiles',
			() => runCommand(() => browseChangedFilesBetweenRefs()),
		),
	);
}

export function deactivate(): void {}
