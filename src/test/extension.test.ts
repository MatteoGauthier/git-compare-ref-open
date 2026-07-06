import * as assert from 'assert';
import * as vscode from 'vscode';
import { buildDiffRange, parseChangedFiles, readDiffRangeModeFromConfig } from '../git/changedFiles';
import { buildChangedFileDiffUris } from '../git/diffUris';
import { EMPTY_DOCUMENT_SCHEME } from '../git/emptyDocument';
import { GitApi, GitRepository } from '../types';

suite('Git Compare Ref Open Test Suite', () => {
	test('buildDiffRange uses three-dot syntax by default', () => {
		assert.strictEqual(buildDiffRange('main', 'feature', 'threeDot'), 'main...feature');
	});

	test('buildDiffRange uses two-dot syntax when configured', () => {
		assert.strictEqual(buildDiffRange('main', 'feature', 'twoDot'), 'main..feature');
	});

	test('readDiffRangeModeFromConfig defaults to threeDot', () => {
		assert.strictEqual(readDiffRangeModeFromConfig(undefined), 'threeDot');
		assert.strictEqual(readDiffRangeModeFromConfig('invalid'), 'threeDot');
	});

	test('readDiffRangeModeFromConfig accepts twoDot', () => {
		assert.strictEqual(readDiffRangeModeFromConfig('twoDot'), 'twoDot');
	});

	test('parseChangedFiles parses modified files', () => {
		const entries = parseChangedFiles('M\0src/file.ts\0');

		assert.strictEqual(entries.length, 1);
		assert.strictEqual(entries[0].status, 'modified');
		assert.strictEqual(entries[0].path, 'src/file.ts');
	});

	test('parseChangedFiles parses added and deleted files', () => {
		const entries = parseChangedFiles('A\0src/new.ts\0D\0src/old.ts\0');

		assert.strictEqual(entries.length, 2);
		assert.strictEqual(entries[0].status, 'added');
		assert.strictEqual(entries[0].path, 'src/new.ts');
		assert.strictEqual(entries[1].status, 'deleted');
		assert.strictEqual(entries[1].path, 'src/old.ts');
	});

	test('parseChangedFiles parses renamed files', () => {
		const entries = parseChangedFiles('R100\0src/old.ts\0src/new.ts\0');

		assert.strictEqual(entries.length, 1);
		assert.strictEqual(entries[0].status, 'renamed');
		assert.strictEqual(entries[0].oldPath, 'src/old.ts');
		assert.strictEqual(entries[0].path, 'src/new.ts');
	});

	test('buildChangedFileDiffUris uses empty left side for added files', () => {
		const repository: GitRepository = {
			rootUri: vscode.Uri.file('/repo'),
		};
		const gitApi: GitApi = {
			repositories: [repository],
			toGitUri: (uri, ref) => uri.with({ query: `ref=${ref}` }),
		};
		const diffUris = buildChangedFileDiffUris(
			gitApi,
			repository,
			{ status: 'added', path: 'src/new.ts' },
			'main',
			'feature',
		);

		assert.strictEqual(diffUris.leftUri.scheme, EMPTY_DOCUMENT_SCHEME);
		assert.strictEqual(diffUris.rightUri.query, 'ref=feature');
		assert.match(diffUris.rightUri.fsPath, /src[/\\]new\.ts$/);
	});

	test('buildChangedFileDiffUris uses empty right side for deleted files', () => {
		const repository: GitRepository = {
			rootUri: vscode.Uri.file('/repo'),
		};
		const gitApi: GitApi = {
			repositories: [repository],
			toGitUri: (uri, ref) => uri.with({ query: `ref=${ref}` }),
		};
		const diffUris = buildChangedFileDiffUris(
			gitApi,
			repository,
			{ status: 'deleted', path: 'src/old.ts' },
			'main',
			'feature',
		);

		assert.strictEqual(diffUris.leftUri.query, 'ref=main');
		assert.strictEqual(diffUris.rightUri.scheme, EMPTY_DOCUMENT_SCHEME);
		assert.match(diffUris.leftUri.fsPath, /src[/\\]old\.ts$/);
	});

	test('buildChangedFileDiffUris uses old and new paths for renamed files', () => {
		const repository: GitRepository = {
			rootUri: vscode.Uri.file('/repo'),
		};
		const gitApi: GitApi = {
			repositories: [repository],
			toGitUri: (uri, ref) => uri.with({ query: `ref=${ref}` }),
		};
		const diffUris = buildChangedFileDiffUris(
			gitApi,
			repository,
			{ status: 'renamed', path: 'src/new.ts', oldPath: 'src/old.ts' },
			'main',
			'feature',
		);

		assert.match(diffUris.leftUri.fsPath, /src[/\\]old\.ts$/);
		assert.match(diffUris.rightUri.fsPath, /src[/\\]new\.ts$/);
	});
});
