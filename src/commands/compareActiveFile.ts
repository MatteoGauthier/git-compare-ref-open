import * as vscode from 'vscode';
import { CompareSide } from '../types';
import { resolveDiffRefs } from '../git/changedFiles';
import {
	buildActiveFileBetweenRefsDiffUris,
	buildActiveFileSingleRefDiffUris,
	openDiff,
} from '../git/diffUris';
import { getGitApi } from '../git/gitApi';
import { promptForRef } from '../git/refs';
import { getRelativePath, resolveRepository } from '../git/repositories';
import { getDefaultDiffRangeMode } from '../git/settings';

function getActiveFileEditor(): vscode.TextEditor {
	const editor = vscode.window.activeTextEditor;

	if (!editor) {
		throw new Error('Open a file in the editor first.');
	}

	if (editor.document.uri.scheme !== 'file') {
		throw new Error('The active editor must be a file on disk.');
	}

	return editor;
}

export async function compareActiveFileWithRef(currentSide: CompareSide): Promise<void> {
	const editor = getActiveFileEditor();
	const gitApi = await getGitApi();
	const repository = await resolveRepository(gitApi, editor.document.uri);
	const relativePath = getRelativePath(repository, editor.document.uri);
	const ref = await promptForRef(repository, 'Select a Git ref to compare with the active file');
	const diffUris = buildActiveFileSingleRefDiffUris(
		gitApi,
		repository,
		relativePath,
		ref,
		editor.document.uri,
		currentSide,
	);

	await openDiff(diffUris.leftUri, diffUris.rightUri, diffUris.title);
}

export async function compareActiveFileBetweenRefs(): Promise<void> {
	const editor = getActiveFileEditor();
	const gitApi = await getGitApi();
	const repository = await resolveRepository(gitApi, editor.document.uri);
	const relativePath = getRelativePath(repository, editor.document.uri);
	const baseRef = await promptForRef(repository, 'Select base ref (ref A)');
	const compareRef = await promptForRef(repository, 'Select compare ref (ref B)');
	const rangeMode = getDefaultDiffRangeMode();
	const { leftRef, rightRef } = await resolveDiffRefs(
		repository.rootUri.fsPath,
		baseRef,
		compareRef,
		rangeMode,
	);
	const diffUris = buildActiveFileBetweenRefsDiffUris(
		gitApi,
		repository,
		relativePath,
		leftRef,
		rightRef,
	);

	await openDiff(diffUris.leftUri, diffUris.rightUri, diffUris.title);
}
