import * as vscode from 'vscode';

export const EMPTY_DOCUMENT_SCHEME = 'git-compare-ref-open-empty';

export function createEmptyDocumentUri(relativePath: string): vscode.Uri {
	return vscode.Uri.from({
		scheme: EMPTY_DOCUMENT_SCHEME,
		path: `/${relativePath}`,
	});
}

export class EmptyDocumentContentProvider implements vscode.TextDocumentContentProvider {
	public provideTextDocumentContent(): string {
		return '';
	}
}

export function registerEmptyDocumentProvider(): vscode.Disposable {
	const provider = new EmptyDocumentContentProvider();

	return vscode.workspace.registerTextDocumentContentProvider(EMPTY_DOCUMENT_SCHEME, provider);
}
