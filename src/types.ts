import * as vscode from 'vscode';

export type DiffRangeMode = 'threeDot' | 'twoDot';

export type CompareSide = 'left' | 'right';

export type ChangedFileStatus = 'added' | 'deleted' | 'modified' | 'renamed' | 'copied' | 'typeChanged' | 'unknown';

export interface ChangedFileEntry {
	status: ChangedFileStatus;
	path: string;
	oldPath?: string;
}

export interface GitRepository {
	rootUri: vscode.Uri;
}

export interface GitApi {
	repositories: GitRepository[];
	toGitUri(uri: vscode.Uri, ref: string): vscode.Uri;
}

export interface GitExtensionExports {
	getAPI(version: 1): GitApi;
}

export interface DiffRefPair {
	baseRef: string;
	compareRef: string;
}

export interface ResolvedDiffRefs {
	leftRef: string;
	rightRef: string;
}
