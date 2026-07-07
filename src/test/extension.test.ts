import * as assert from 'assert';
import * as vscode from 'vscode';
import { buildDiffRange, parseChangedFiles, readDiffRangeModeFromConfig } from '../git/changedFiles';
import {
	buildActiveFileBetweenRefsDiffUris,
	buildActiveFileSingleRefDiffUris,
	buildChangedFileDiffUris,
} from '../git/diffUris';
import { EMPTY_DOCUMENT_SCHEME } from '../git/emptyDocument';
import { buildDiffDeepLink, parseDiffLinkQuery } from '../links/deepLink';
import { buildRemoteCompareUrl, parseRemoteUrl } from '../links/remoteLink';
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

	test('buildActiveFileSingleRefDiffUris uses the resolved old path on the ref side', () => {
		const repository: GitRepository = {
			rootUri: vscode.Uri.file('/repo'),
		};
		const gitApi: GitApi = {
			repositories: [repository],
			toGitUri: (uri, ref) => uri.with({ query: `ref=${ref}` }),
		};
		const currentUri = vscode.Uri.file('/repo/src/new.ts');
		const diffUris = buildActiveFileSingleRefDiffUris(
			gitApi,
			repository,
			'src/new.ts',
			'alpha',
			currentUri,
			'right',
			'src/old.ts',
		);

		assert.match(diffUris.leftUri.fsPath, /src[/\\]old\.ts$/);
		assert.strictEqual(diffUris.leftUri.query, 'ref=alpha');
		assert.strictEqual(diffUris.rightUri.fsPath, currentUri.fsPath);
		assert.strictEqual(diffUris.title, 'alpha ↔ Current: src/old.ts → src/new.ts');
	});

	test('buildActiveFileSingleRefDiffUris uses empty ref side when the file is absent at the ref', () => {
		const repository: GitRepository = {
			rootUri: vscode.Uri.file('/repo'),
		};
		const gitApi: GitApi = {
			repositories: [repository],
			toGitUri: (uri, ref) => uri.with({ query: `ref=${ref}` }),
		};
		const currentUri = vscode.Uri.file('/repo/src/new.ts');
		const diffUris = buildActiveFileSingleRefDiffUris(
			gitApi,
			repository,
			'src/new.ts',
			'alpha',
			currentUri,
			'right',
			undefined,
		);

		assert.strictEqual(diffUris.leftUri.scheme, EMPTY_DOCUMENT_SCHEME);
		assert.strictEqual(diffUris.title, 'Empty ↔ Current: src/new.ts');
	});

	test('buildActiveFileBetweenRefsDiffUris uses per-ref resolved paths', () => {
		const repository: GitRepository = {
			rootUri: vscode.Uri.file('/repo'),
		};
		const gitApi: GitApi = {
			repositories: [repository],
			toGitUri: (uri, ref) => uri.with({ query: `ref=${ref}` }),
		};
		const diffUris = buildActiveFileBetweenRefsDiffUris(
			gitApi,
			repository,
			'src/new.ts',
			'main',
			'feature',
			'src/old.ts',
			'src/new.ts',
		);

		assert.match(diffUris.leftUri.fsPath, /src[/\\]old\.ts$/);
		assert.strictEqual(diffUris.leftUri.query, 'ref=main');
		assert.match(diffUris.rightUri.fsPath, /src[/\\]new\.ts$/);
		assert.strictEqual(diffUris.rightUri.query, 'ref=feature');
		assert.strictEqual(diffUris.title, 'main ↔ feature: src/old.ts → src/new.ts');
	});

	test('diff deep link round-trips through a parsed URI', () => {
		const deepLink = buildDiffDeepLink('vscode', 'MatteoGauthier.git-compare-ref-open', {
			left: 'main',
			right: 'feature/foo bar',
			file: 'src/file.ts',
			path: '/Users/me/dev/repo',
			range: 'threeDot',
		});
		const parsedUri = vscode.Uri.parse(deepLink.toString(true));

		assert.strictEqual(parsedUri.scheme, 'vscode');
		assert.strictEqual(parsedUri.authority, 'matteogauthier.git-compare-ref-open');
		assert.strictEqual(parsedUri.path, '/diff');

		const params = parseDiffLinkQuery(parsedUri.query);

		assert.strictEqual(params.left, 'main');
		assert.strictEqual(params.right, 'feature/foo bar');
		assert.strictEqual(params.file, 'src/file.ts');
		assert.strictEqual(params.path, '/Users/me/dev/repo');
		assert.strictEqual(params.range, 'threeDot');
	});

	test('parseDiffLinkQuery defaults range and omits empty path', () => {
		const params = parseDiffLinkQuery('left=main&right=feature&file=src/file.ts');

		assert.strictEqual(params.range, 'threeDot');
		assert.strictEqual(params.path, undefined);
	});

	test('parseDiffLinkQuery rejects missing required parameters', () => {
		assert.throws(
			() => parseDiffLinkQuery('left=main&right=feature'),
			/missing required/,
		);
	});

	test('parseRemoteUrl parses SSH and HTTPS remotes', () => {
		assert.deepStrictEqual(parseRemoteUrl('git@github.com:owner/repo.git'), {
			host: 'github',
			webBaseUrl: 'https://github.com/owner/repo',
		});
		assert.deepStrictEqual(parseRemoteUrl('https://gitlab.com/group/subgroup/repo.git'), {
			host: 'gitlab',
			webBaseUrl: 'https://gitlab.com/group/subgroup/repo',
		});
		assert.deepStrictEqual(parseRemoteUrl('ssh://git@bitbucket.org/owner/repo.git'), {
			host: 'bitbucket',
			webBaseUrl: 'https://bitbucket.org/owner/repo',
		});
		assert.deepStrictEqual(parseRemoteUrl('git@gitlab.company.com:owner/repo.git'), {
			host: 'gitlab',
			webBaseUrl: 'https://gitlab.company.com/owner/repo',
		});
	});

	test('parseRemoteUrl rejects unsupported hosts and malformed URLs', () => {
		assert.strictEqual(parseRemoteUrl('git@git.sr.ht:~owner/repo'), undefined);
		assert.strictEqual(parseRemoteUrl('/local/bare/repo.git'), undefined);
		assert.strictEqual(parseRemoteUrl('git@github.com:repo-without-owner'), undefined);
	});

	test('buildRemoteCompareUrl builds a GitHub compare URL with a file anchor', () => {
		const remote = { host: 'github' as const, webBaseUrl: 'https://github.com/owner/repo' };

		assert.strictEqual(
			buildRemoteCompareUrl(remote, 'main', 'feature/foo', 'threeDot', 'src/file.ts'),
			'https://github.com/owner/repo/compare/main...feature/foo'
			+ '#diff-bc9705d0f7a567399044dfc66ccc82d4d9aa1cff116842a0094d54e463c9ecbc',
		);
		assert.strictEqual(
			buildRemoteCompareUrl(remote, 'main', 'feature', 'twoDot'),
			'https://github.com/owner/repo/compare/main..feature',
		);
	});

	test('buildRemoteCompareUrl builds a GitLab compare URL', () => {
		const remote = { host: 'gitlab' as const, webBaseUrl: 'https://gitlab.com/group/repo' };

		assert.strictEqual(
			buildRemoteCompareUrl(remote, 'main', 'feature', 'threeDot', 'src/file.ts'),
			'https://gitlab.com/group/repo/-/compare/main...feature'
			+ '#diff-content-fe0ea98c799ff6bd74b212310873eb13adb520aa',
		);
		assert.strictEqual(
			buildRemoteCompareUrl(remote, 'main', 'feature', 'twoDot'),
			'https://gitlab.com/group/repo/-/compare/main...feature?straight=true',
		);
	});

	test('buildRemoteCompareUrl builds a repository-level Bitbucket compare URL', () => {
		const remote = { host: 'bitbucket' as const, webBaseUrl: 'https://bitbucket.org/owner/repo' };

		assert.strictEqual(
			buildRemoteCompareUrl(remote, 'main', 'feature', 'threeDot', 'src/file.ts'),
			'https://bitbucket.org/owner/repo/branches/compare/feature..main',
		);
	});
});
