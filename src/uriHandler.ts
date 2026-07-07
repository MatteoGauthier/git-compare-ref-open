import * as vscode from 'vscode';
import {
	listChangedFiles,
	pathExistsAtRef,
	resolveDiffRefs,
} from './git/changedFiles';
import {
	buildActiveFileBetweenRefsDiffUris,
	buildChangedFileDiffUris,
	openDiff,
} from './git/diffUris';
import { getGitApi } from './git/gitApi';
import { findRepositoryForUri, resolveRepository } from './git/repositories';
import { runGit } from './git/runGit';
import { DIFF_LINK_PATH, parseDiffLinkQuery } from './links/deepLink';
import { GitApi, GitRepository } from './types';

async function resolveRepositoryForLink(
	gitApi: GitApi,
	path: string | undefined,
): Promise<GitRepository> {
	if (path) {
		const repository = findRepositoryForUri(gitApi.repositories, vscode.Uri.file(path));

		if (!repository) {
			throw new Error(`No open Git repository contains "${path}". Open the repository folder first.`);
		}

		return repository;
	}

	return resolveRepository(gitApi);
}

async function assertRefExists(repositoryRoot: string, ref: string): Promise<void> {
	try {
		await runGit(repositoryRoot, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
	} catch {
		throw new Error(`Git ref "${ref}" was not found in the repository.`);
	}
}

export async function handleDiffUri(uri: vscode.Uri): Promise<void> {
	if (uri.path !== DIFF_LINK_PATH) {
		throw new Error(`Unsupported deep link path "${uri.path}".`);
	}

	const params = parseDiffLinkQuery(uri.query);
	const gitApi = await getGitApi();
	const repository = await resolveRepositoryForLink(gitApi, params.path);
	const repositoryRoot = repository.rootUri.fsPath;

	await assertRefExists(repositoryRoot, params.left);
	await assertRefExists(repositoryRoot, params.right);

	const { leftRef, rightRef } = await resolveDiffRefs(
		repositoryRoot,
		params.left,
		params.right,
		params.range,
	);
	const changedFiles = await listChangedFiles(
		repositoryRoot,
		params.left,
		params.right,
		params.range,
	);
	const entry = changedFiles.find(
		(candidate) => candidate.path === params.file || candidate.oldPath === params.file,
	);

	if (entry) {
		const diffUris = buildChangedFileDiffUris(gitApi, repository, entry, leftRef, rightRef);

		await openDiff(diffUris.leftUri, diffUris.rightUri, diffUris.title);

		return;
	}

	const fileExists = await pathExistsAtRef(repositoryRoot, rightRef, params.file)
		|| await pathExistsAtRef(repositoryRoot, leftRef, params.file);

	if (!fileExists) {
		throw new Error(`File "${params.file}" was not found at "${params.left}" or "${params.right}".`);
	}

	const diffUris = buildActiveFileBetweenRefsDiffUris(
		gitApi,
		repository,
		params.file,
		leftRef,
		rightRef,
		params.file,
		params.file,
	);

	await openDiff(diffUris.leftUri, diffUris.rightUri, diffUris.title);
}

export function registerDiffUriHandler(): vscode.Disposable {
	return vscode.window.registerUriHandler({
		handleUri: (uri) => {
			void handleDiffUri(uri).catch(async (error: unknown) => {
				const message = error instanceof Error ? error.message : 'Unable to open the diff link.';

				await vscode.window.showErrorMessage(message);
			});
		},
	});
}
