import * as vscode from 'vscode';
import { GitApi, GitExtensionExports } from '../types';

const GIT_EXTENSION_ID = 'vscode.git';

export async function getGitApi(): Promise<GitApi> {
	const gitExtension = vscode.extensions.getExtension<GitExtensionExports>(GIT_EXTENSION_ID);

	if (!gitExtension) {
		throw new Error('The built-in Git extension is not available.');
	}

	if (!gitExtension.isActive) {
		await gitExtension.activate();
	}

	const gitApi = gitExtension.exports.getAPI(1);

	if (gitApi.repositories.length === 0) {
		throw new Error('No Git repository found in the current workspace.');
	}

	return gitApi;
}
