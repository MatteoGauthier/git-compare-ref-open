import { ChangedFileEntry, ChangedFileStatus, DiffRangeMode, ResolvedDiffRefs } from '../types';
import { runGit } from './runGit';

const STATUS_MAP: Record<string, ChangedFileStatus> = {
	A: 'added',
	D: 'deleted',
	M: 'modified',
	R: 'renamed',
	C: 'copied',
	T: 'typeChanged',
};

export function buildDiffRange(baseRef: string, compareRef: string, rangeMode: DiffRangeMode): string {
	if (rangeMode === 'threeDot') {
		return `${baseRef}...${compareRef}`;
	}

	return `${baseRef}..${compareRef}`;
}

export async function resolveDiffRefs(
	repositoryRoot: string,
	baseRef: string,
	compareRef: string,
	rangeMode: DiffRangeMode,
): Promise<ResolvedDiffRefs> {
	if (rangeMode === 'twoDot') {
		return {
			leftRef: baseRef,
			rightRef: compareRef,
		};
	}

	const mergeBase = (await runGit(repositoryRoot, ['merge-base', baseRef, compareRef])).trim();

	return {
		leftRef: mergeBase,
		rightRef: compareRef,
	};
}

export async function listChangedFiles(
	repositoryRoot: string,
	baseRef: string,
	compareRef: string,
	rangeMode: DiffRangeMode,
): Promise<ChangedFileEntry[]> {
	const diffRange = buildDiffRange(baseRef, compareRef, rangeMode);
	const output = await runGit(repositoryRoot, ['diff', '--name-status', '-z', diffRange]);

	return parseChangedFiles(output);
}

export function parseChangedFiles(output: string): ChangedFileEntry[] {
	if (output.length === 0) {
		return [];
	}

	const entries: ChangedFileEntry[] = [];
	const parts = output.split('\0').filter((part) => part.length > 0);
	let index = 0;

	while (index < parts.length) {
		const statusToken = parts[index];
		index += 1;

		const statusCode = statusToken.charAt(0);
		const status = STATUS_MAP[statusCode] ?? 'unknown';

		if (status === 'renamed' || status === 'copied') {
			const oldPath = parts[index];
			index += 1;
			const path = parts[index];
			index += 1;

			entries.push({
				status,
				path,
				oldPath,
			});
			continue;
		}

		const path = parts[index];
		index += 1;

		entries.push({
			status,
			path,
		});
	}

	return entries;
}

export async function resolvePathAtRef(
	repositoryRoot: string,
	ref: string,
	workingPath: string,
): Promise<string | undefined> {
	try {
		await runGit(repositoryRoot, ['cat-file', '-e', `${ref}:${workingPath}`]);

		return workingPath;
	} catch {
		// Path is absent at the ref; look for a rename below.
	}

	const output = await runGit(repositoryRoot, [
		'diff',
		'--name-status',
		'-z',
		'--find-renames',
		'--diff-filter=RC',
		ref,
	]);
	const entries = parseChangedFiles(output);

	return entries.find((entry) => entry.path === workingPath)?.oldPath;
}

export function readDiffRangeModeFromConfig(value: string | undefined): DiffRangeMode {
	if (value === 'twoDot') {
		return 'twoDot';
	}

	return 'threeDot';
}
