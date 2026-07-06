import * as vscode from 'vscode';
import { ChangedFileEntry, GitApi, GitRepository } from '../types';
import { createEmptyDocumentUri } from './emptyDocument';
import { fileUriForPath } from './repositories';

export function toGitRefUri(
	gitApi: GitApi,
	repository: GitRepository,
	relativePath: string,
	ref: string,
): vscode.Uri {
	const fileUri = fileUriForPath(repository, relativePath);

	return gitApi.toGitUri(fileUri, ref);
}

export function buildDiffTitle(leftLabel: string, rightLabel: string, relativePath: string): string {
	return `${leftLabel} ↔ ${rightLabel}: ${relativePath}`;
}

export interface DiffUriPair {
	leftUri: vscode.Uri;
	rightUri: vscode.Uri;
	title: string;
}

export function buildActiveFileSingleRefDiffUris(
	gitApi: GitApi,
	repository: GitRepository,
	relativePath: string,
	ref: string,
	currentUri: vscode.Uri,
	currentSide: 'left' | 'right',
): DiffUriPair {
	const refUri = toGitRefUri(gitApi, repository, relativePath, ref);
	const leftUri = currentSide === 'left' ? currentUri : refUri;
	const rightUri = currentSide === 'right' ? currentUri : refUri;
	const leftLabel = currentSide === 'left' ? 'Current' : ref;
	const rightLabel = currentSide === 'right' ? 'Current' : ref;

	return {
		leftUri,
		rightUri,
		title: buildDiffTitle(leftLabel, rightLabel, relativePath),
	};
}

export function buildActiveFileBetweenRefsDiffUris(
	gitApi: GitApi,
	repository: GitRepository,
	relativePath: string,
	leftRef: string,
	rightRef: string,
): DiffUriPair {
	return {
		leftUri: toGitRefUri(gitApi, repository, relativePath, leftRef),
		rightUri: toGitRefUri(gitApi, repository, relativePath, rightRef),
		title: buildDiffTitle(leftRef, rightRef, relativePath),
	};
}

export function buildChangedFileDiffUris(
	gitApi: GitApi,
	repository: GitRepository,
	entry: ChangedFileEntry,
	leftRef: string,
	rightRef: string,
): DiffUriPair {
	switch (entry.status) {
		case 'added':
			return {
				leftUri: createEmptyDocumentUri(entry.path),
				rightUri: toGitRefUri(gitApi, repository, entry.path, rightRef),
				title: buildDiffTitle('Empty', rightRef, entry.path),
			};
		case 'deleted':
			return {
				leftUri: toGitRefUri(gitApi, repository, entry.path, leftRef),
				rightUri: createEmptyDocumentUri(entry.path),
				title: buildDiffTitle(leftRef, 'Empty', entry.path),
			};
		case 'renamed':
		case 'copied': {
			const oldPath = entry.oldPath ?? entry.path;

			return {
				leftUri: toGitRefUri(gitApi, repository, oldPath, leftRef),
				rightUri: toGitRefUri(gitApi, repository, entry.path, rightRef),
				title: buildDiffTitle(leftRef, rightRef, entry.path),
			};
		}
		case 'modified':
		case 'typeChanged':
		case 'unknown':
			return {
				leftUri: toGitRefUri(gitApi, repository, entry.path, leftRef),
				rightUri: toGitRefUri(gitApi, repository, entry.path, rightRef),
				title: buildDiffTitle(leftRef, rightRef, entry.path),
			};
		default: {
			const exhaustiveCheck: never = entry.status;

			throw new Error(`Unsupported changed file status: ${exhaustiveCheck}`);
		}
	}
}

export async function openDiff(leftUri: vscode.Uri, rightUri: vscode.Uri, title: string): Promise<void> {
	await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title, {
		preview: true,
	});
}
