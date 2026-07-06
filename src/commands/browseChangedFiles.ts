import * as vscode from 'vscode';
import { ChangedFileEntry } from '../types';
import { listChangedFiles, resolveDiffRefs } from '../git/changedFiles';
import { buildChangedFileDiffUris, openDiff } from '../git/diffUris';
import { getGitApi } from '../git/gitApi';
import { promptForRef } from '../git/refs';
import { resolveRepository } from '../git/repositories';
import { getDefaultDiffRangeMode } from '../git/settings';

interface ChangedFileQuickPickItem extends vscode.QuickPickItem {
	entry: ChangedFileEntry;
}

function formatStatusLabel(status: ChangedFileEntry['status']): string {
	switch (status) {
		case 'added':
			return 'Added';
		case 'deleted':
			return 'Deleted';
		case 'modified':
			return 'Modified';
		case 'renamed':
			return 'Renamed';
		case 'copied':
			return 'Copied';
		case 'typeChanged':
			return 'Type changed';
		case 'unknown':
			return 'Changed';
		default: {
			const exhaustiveCheck: never = status;

			throw new Error(`Unsupported changed file status: ${exhaustiveCheck}`);
		}
	}
}

function toQuickPickItem(entry: ChangedFileEntry): ChangedFileQuickPickItem {
	const statusLabel = formatStatusLabel(entry.status);
	const description = entry.oldPath && entry.oldPath !== entry.path
		? `${statusLabel} · ${entry.oldPath} → ${entry.path}`
		: statusLabel;

	return {
		label: entry.path,
		description,
		entry,
	};
}

export async function browseChangedFilesBetweenRefs(): Promise<void> {
	const gitApi = await getGitApi();
	const activeFileUri = vscode.window.activeTextEditor?.document.uri;
	const repository = await resolveRepository(
		gitApi,
		activeFileUri?.scheme === 'file' ? activeFileUri : undefined,
	);
	const baseRef = await promptForRef(repository, 'Select base ref (ref A)');
	const compareRef = await promptForRef(repository, 'Select compare ref (ref B)');
	const rangeMode = getDefaultDiffRangeMode();
	const changedFiles = await listChangedFiles(
		repository.rootUri.fsPath,
		baseRef,
		compareRef,
		rangeMode,
	);

	if (changedFiles.length === 0) {
		await vscode.window.showInformationMessage('No changed files found between the selected refs.');

		return;
	}

	const selectedFile = await vscode.window.showQuickPick(
		changedFiles.map(toQuickPickItem),
		{
			placeHolder: `Select a changed file (${changedFiles.length} files)`,
			matchOnDescription: true,
		},
	);

	if (!selectedFile) {
		return;
	}

	const { leftRef, rightRef } = await resolveDiffRefs(
		repository.rootUri.fsPath,
		baseRef,
		compareRef,
		rangeMode,
	);
	const diffUris = buildChangedFileDiffUris(
		gitApi,
		repository,
		selectedFile.entry,
		leftRef,
		rightRef,
	);

	await openDiff(diffUris.leftUri, diffUris.rightUri, diffUris.title);
}
