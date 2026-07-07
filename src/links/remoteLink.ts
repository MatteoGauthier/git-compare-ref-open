import { createHash } from 'node:crypto';
import { DiffRangeMode } from '../types';

export type RemoteHost = 'github' | 'gitlab' | 'bitbucket';

export interface ParsedRemote {
	host: RemoteHost;
	webBaseUrl: string;
}

function detectHost(hostname: string): RemoteHost | undefined {
	const normalized = hostname.toLowerCase();

	if (normalized.includes('github')) {
		return 'github';
	}

	if (normalized.includes('gitlab')) {
		return 'gitlab';
	}

	if (normalized.includes('bitbucket')) {
		return 'bitbucket';
	}

	return undefined;
}

const SCP_REMOTE_PATTERN = /^(?:[\w.-]+@)?([\w.-]+):(.+)$/;

export function parseRemoteUrl(remoteUrl: string): ParsedRemote | undefined {
	const normalized = remoteUrl.trim();
	let hostname: string | undefined;
	let repositoryPath: string | undefined;

	if (normalized.includes('://')) {
		try {
			const url = new URL(normalized);
			hostname = url.hostname;
			repositoryPath = url.pathname;
		} catch {
			return undefined;
		}
	} else {
		const scpMatch = SCP_REMOTE_PATTERN.exec(normalized);

		if (!scpMatch) {
			return undefined;
		}

		hostname = scpMatch[1];
		repositoryPath = scpMatch[2];
	}

	const cleanedPath = repositoryPath
		.replace(/^\/+/, '')
		.replace(/\.git$/, '')
		.replace(/\/+$/, '');

	if (!hostname || cleanedPath.split('/').length < 2) {
		return undefined;
	}

	const host = detectHost(hostname);

	if (!host) {
		return undefined;
	}

	return {
		host,
		webBaseUrl: `https://${hostname}/${cleanedPath}`,
	};
}

function encodeRef(ref: string): string {
	return encodeURIComponent(ref).replace(/%2F/gi, '/');
}

function sha256Hex(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function sha1Hex(value: string): string {
	return createHash('sha1').update(value).digest('hex');
}

export function buildRemoteCompareUrl(
	remote: ParsedRemote,
	baseRef: string,
	compareRef: string,
	rangeMode: DiffRangeMode,
	filePath?: string,
): string {
	const base = encodeRef(baseRef);
	const head = encodeRef(compareRef);

	switch (remote.host) {
		case 'github': {
			const separator = rangeMode === 'twoDot' ? '..' : '...';
			const anchor = filePath ? `#diff-${sha256Hex(filePath)}` : '';

			return `${remote.webBaseUrl}/compare/${base}${separator}${head}${anchor}`;
		}
		case 'gitlab': {
			const straight = rangeMode === 'twoDot' ? '?straight=true' : '';
			const anchor = filePath ? `#diff-content-${sha1Hex(filePath)}` : '';

			return `${remote.webBaseUrl}/-/compare/${base}...${head}${straight}${anchor}`;
		}
		case 'bitbucket':
			// Bitbucket compare shows the source (head) against the destination (base)
			// and has no stable per-file anchor, so the link stays repository-level.
			return `${remote.webBaseUrl}/branches/compare/${head}..${base}`;
		default: {
			const exhaustiveCheck: never = remote.host;

			throw new Error(`Unsupported remote host: ${exhaustiveCheck}`);
		}
	}
}
