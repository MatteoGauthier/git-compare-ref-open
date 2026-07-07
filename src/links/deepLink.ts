import * as vscode from 'vscode';
import { DiffRangeMode } from '../types';
import { readDiffRangeModeFromConfig } from '../git/changedFiles';

export const DIFF_LINK_PATH = '/diff';

export interface DiffLinkParams {
	left: string;
	right: string;
	file: string;
	path?: string;
	range: DiffRangeMode;
}

export function buildDiffLinkQuery(params: DiffLinkParams): string {
	const query = new URLSearchParams({
		left: params.left,
		right: params.right,
		file: params.file,
	});

	if (params.path) {
		query.set('path', params.path);
	}

	query.set('range', params.range);

	return query.toString();
}

export function buildDiffDeepLink(
	uriScheme: string,
	extensionId: string,
	params: DiffLinkParams,
): vscode.Uri {
	return vscode.Uri.from({
		scheme: uriScheme,
		authority: extensionId,
		path: DIFF_LINK_PATH,
		query: buildDiffLinkQuery(params),
	});
}

export function parseDiffLinkQuery(query: string): DiffLinkParams {
	const searchParams = new URLSearchParams(query);
	const left = searchParams.get('left')?.trim();
	const right = searchParams.get('right')?.trim();
	const file = searchParams.get('file')?.trim();
	const path = searchParams.get('path')?.trim();

	if (!left || !right || !file) {
		throw new Error('The diff link is missing required "left", "right", or "file" query parameters.');
	}

	return {
		left,
		right,
		file,
		path: path || undefined,
		range: readDiffRangeModeFromConfig(searchParams.get('range') ?? undefined),
	};
}
