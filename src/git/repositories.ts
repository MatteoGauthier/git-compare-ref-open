import * as path from 'node:path';
import * as vscode from 'vscode';
import { GitApi, GitRepository } from '../types';

export function findRepositoryForUri(
	repositories: GitRepository[],
	fileUri: vscode.Uri,
): GitRepository | undefined {
	const normalizedFilePath = path.normalize(fileUri.fsPath);

	return repositories.find((repository) => {
		const repositoryRoot = path.normalize(repository.rootUri.fsPath);

		return normalizedFilePath === repositoryRoot
			|| normalizedFilePath.startsWith(`${repositoryRoot}${path.sep}`);
	});
}

export async function resolveRepository(
	gitApi: GitApi,
	fileUri?: vscode.Uri,
): Promise<GitRepository> {
	if (fileUri) {
		const repository = findRepositoryForUri(gitApi.repositories, fileUri);

		if (repository) {
			return repository;
		}
	}

	if (gitApi.repositories.length === 1) {
		return gitApi.repositories[0];
	}

	const selectedRepository = await vscode.window.showQuickPick(
		gitApi.repositories.map((repository) => ({
			label: path.basename(repository.rootUri.fsPath),
			description: repository.rootUri.fsPath,
			repository,
		})),
		{
			placeHolder: 'Select a Git repository',
		},
	);

	if (!selectedRepository) {
		throw new Error('No Git repository selected.');
	}

	return selectedRepository.repository;
}

export function getRelativePath(repository: GitRepository, fileUri: vscode.Uri): string {
	const relativePath = path.relative(repository.rootUri.fsPath, fileUri.fsPath);

	if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
		throw new Error('The active file is outside the selected Git repository.');
	}

	return relativePath.split(path.sep).join('/');
}

export function fileUriForPath(repository: GitRepository, relativePath: string): vscode.Uri {
	return vscode.Uri.file(path.join(repository.rootUri.fsPath, relativePath));
}
