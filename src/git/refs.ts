import * as vscode from 'vscode';
import { GitRepository } from '../types';
import { GitCommandError, runGit } from './runGit';

export interface RefQuickPickItem extends vscode.QuickPickItem {
	ref: string;
}

const REF_FORMAT = '%(refname:short)\t%(objectname:short)\t%(subject)';

export async function listRefQuickPickItems(repository: GitRepository): Promise<RefQuickPickItem[]> {
	const output = await runGit(repository.rootUri.fsPath, [
		'for-each-ref',
		`--format=${REF_FORMAT}`,
		'refs/heads',
		'refs/remotes',
		'refs/tags',
	]);

	const items = output
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => {
			const [ref, commit, ...subjectParts] = line.split('\t');
			const subject = subjectParts.join('\t');

			return {
				label: ref,
				description: commit,
				detail: subject,
				ref,
			} satisfies RefQuickPickItem;
		});

	return items;
}

export async function promptForRef(
	repository: GitRepository,
	placeHolder: string,
): Promise<string> {
	const items = await listRefQuickPickItems(repository);

	const selectedRef = await vscode.window.showQuickPick(items, {
		placeHolder,
		matchOnDescription: true,
		matchOnDetail: true,
	});

	if (selectedRef) {
		return selectedRef.ref;
	}

	const typedRef = await vscode.window.showInputBox({
		placeHolder: 'Enter a Git ref (branch, tag, commit)',
		validateInput: async (value) => {
			const trimmedValue = value.trim();

			if (trimmedValue.length === 0) {
				return 'Enter a Git ref.';
			}

			try {
				await runGit(repository.rootUri.fsPath, ['rev-parse', '--verify', trimmedValue]);

				return undefined;
			} catch (error) {
				if (error instanceof GitCommandError) {
					return `Git ref "${trimmedValue}" was not found.`;
				}

				return 'Unable to validate the Git ref.';
			}
		},
	});

	if (!typedRef) {
		throw new Error('No Git ref selected.');
	}

	return typedRef.trim();
}
