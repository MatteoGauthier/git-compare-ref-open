import * as vscode from 'vscode';
import { DiffRangeMode, GitApi, GitRepository } from '../types';
import { buildDiffDeepLink, DiffLinkParams } from '../links/deepLink';
import { buildRemoteCompareUrl, parseRemoteUrl } from '../links/remoteLink';
import { getGitApi } from '../git/gitApi';
import { promptForRef } from '../git/refs';
import { findRepositoryForUri, getRelativePath, resolveRepository } from '../git/repositories';
import { runGit } from '../git/runGit';
import { getDefaultDiffRangeMode } from '../git/settings';

interface GitUriInfo {
	fsPath: string;
	ref: string;
}

function parseGitUri(uri: vscode.Uri): GitUriInfo | undefined {
	if (uri.scheme !== 'git') {
		return undefined;
	}

	try {
		const query = JSON.parse(uri.query) as { path?: unknown; ref?: unknown };

		if (typeof query.path === 'string' && typeof query.ref === 'string' && query.ref.length > 0) {
			return { fsPath: query.path, ref: query.ref };
		}
	} catch {
		// Not a git URI produced by the built-in Git extension.
	}

	return undefined;
}

interface DiffTabContext {
	repository: GitRepository;
	params: DiffLinkParams;
}

function findDiffTabInput(targetUri?: vscode.Uri): vscode.TabInputTextDiff | undefined {
	if (targetUri) {
		for (const group of vscode.window.tabGroups.all) {
			for (const tab of group.tabs) {
				if (
					tab.input instanceof vscode.TabInputTextDiff
					&& tab.input.modified.toString() === targetUri.toString()
				) {
					return tab.input;
				}
			}
		}

		return undefined;
	}

	const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;

	return input instanceof vscode.TabInputTextDiff ? input : undefined;
}

function getDiffTabContext(gitApi: GitApi, targetUri?: vscode.Uri): DiffTabContext | undefined {
	const input = findDiffTabInput(targetUri);

	if (!input) {
		return undefined;
	}

	const left = parseGitUri(input.original);
	const right = parseGitUri(input.modified);

	if (!left || !right) {
		return undefined;
	}

	const fileUri = vscode.Uri.file(right.fsPath);
	const repository = findRepositoryForUri(gitApi.repositories, fileUri);

	if (!repository) {
		return undefined;
	}

	return {
		repository,
		params: {
			left: left.ref,
			right: right.ref,
			file: getRelativePath(repository, fileUri),
			path: repository.rootUri.fsPath,
			// Refs in an open diff tab are already resolved (three-dot compares
			// use the merge-base commit), so the link must not re-resolve them.
			range: 'twoDot',
		},
	};
}

async function promptDiffLinkParams(gitApi: GitApi): Promise<DiffLinkParams> {
	const editor = vscode.window.activeTextEditor;

	if (!editor || editor.document.uri.scheme !== 'file') {
		throw new Error('Focus a ref diff tab or open a file in the editor to copy a diff link.');
	}

	const repository = await resolveRepository(gitApi, editor.document.uri);
	const file = getRelativePath(repository, editor.document.uri);
	const baseRef = await promptForRef(repository, 'Select base ref (ref A)');
	const compareRef = await promptForRef(repository, 'Select compare ref (ref B)');

	return {
		left: baseRef,
		right: compareRef,
		file,
		path: repository.rootUri.fsPath,
		range: getDefaultDiffRangeMode(),
	};
}

async function toExternalLink(uri: vscode.Uri): Promise<string> {
	try {
		const externalUri = await vscode.env.asExternalUri(uri);

		return externalUri.toString(true);
	} catch {
		return uri.toString(true);
	}
}

export async function copyDiffLink(extensionId: string, resourceUri?: vscode.Uri): Promise<void> {
	const gitApi = await getGitApi();
	const params = getDiffTabContext(gitApi, resourceUri)?.params ?? await promptDiffLinkParams(gitApi);
	const deepLink = buildDiffDeepLink(vscode.env.uriScheme, extensionId, params);
	const link = await toExternalLink(deepLink);

	await vscode.env.clipboard.writeText(link);
	await vscode.window.showInformationMessage('Diff link copied to clipboard.');
}

interface GitRemote {
	name: string;
	url: string;
}

async function getDefaultRemote(repositoryRoot: string): Promise<GitRemote> {
	const remoteNames = (await runGit(repositoryRoot, ['remote']))
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (remoteNames.length === 0) {
		throw new Error('No Git remote is configured for this repository.');
	}

	const name = remoteNames.includes('origin') ? 'origin' : remoteNames[0];
	const url = (await runGit(repositoryRoot, ['remote', 'get-url', name])).trim();

	return { name, url };
}

function stripRemotePrefix(ref: string, remoteName: string): string {
	return ref.startsWith(`${remoteName}/`) ? ref.slice(remoteName.length + 1) : ref;
}

function tryGetRelativePath(repository: GitRepository, fileUri: vscode.Uri): string | undefined {
	try {
		return getRelativePath(repository, fileUri);
	} catch {
		return undefined;
	}
}

interface RemoteDiffLinkContext {
	repository: GitRepository;
	baseRef: string;
	compareRef: string;
	rangeMode: DiffRangeMode;
	filePath?: string;
}

async function promptRemoteDiffLinkContext(gitApi: GitApi): Promise<RemoteDiffLinkContext> {
	const activeUri = vscode.window.activeTextEditor?.document.uri;
	const fileUri = activeUri?.scheme === 'file' ? activeUri : undefined;
	const repository = await resolveRepository(gitApi, fileUri);
	const filePath = fileUri ? tryGetRelativePath(repository, fileUri) : undefined;
	const baseRef = await promptForRef(repository, 'Select base ref (ref A)');
	const compareRef = await promptForRef(repository, 'Select compare ref (ref B)');

	return {
		repository,
		baseRef,
		compareRef,
		rangeMode: getDefaultDiffRangeMode(),
		filePath,
	};
}

export async function copyRemoteDiffLink(resourceUri?: vscode.Uri): Promise<void> {
	const gitApi = await getGitApi();
	const tabContext = getDiffTabContext(gitApi, resourceUri);
	const { repository, baseRef, compareRef, rangeMode, filePath } = tabContext
		? {
			repository: tabContext.repository,
			baseRef: tabContext.params.left,
			compareRef: tabContext.params.right,
			// Tab refs are already resolved, so a direct two-dot compare
			// reproduces exactly what the diff editor is showing.
			rangeMode: 'twoDot' as DiffRangeMode,
			filePath: tabContext.params.file,
		}
		: await promptRemoteDiffLinkContext(gitApi);
	const remote = await getDefaultRemote(repository.rootUri.fsPath);
	const parsedRemote = parseRemoteUrl(remote.url);

	if (!parsedRemote) {
		throw new Error(
			`Unsupported Git remote "${remote.url}". Supported hosts: GitHub, GitLab, and Bitbucket.`,
		);
	}

	const url = buildRemoteCompareUrl(
		parsedRemote,
		stripRemotePrefix(baseRef, remote.name),
		stripRemotePrefix(compareRef, remote.name),
		rangeMode,
		filePath,
	);

	await vscode.env.clipboard.writeText(url);
	await vscode.window.showInformationMessage('Remote diff link copied to clipboard.');
}
