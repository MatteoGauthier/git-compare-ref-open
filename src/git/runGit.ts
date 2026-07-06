import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export class GitCommandError extends Error {
	public readonly stderr: string;

	public constructor(message: string, stderr: string) {
		super(message);
		this.name = 'GitCommandError';
		this.stderr = stderr;
	}
}

export async function runGit(
	repositoryRoot: string,
	args: string[],
): Promise<string> {
	try {
		const { stdout } = await execFileAsync('git', ['-C', repositoryRoot, ...args], {
			maxBuffer: 10 * 1024 * 1024,
		});

		return stdout;
	} catch (error) {
		if (error instanceof Error && 'stderr' in error) {
			const stderr = String((error as NodeJS.ErrnoException & { stderr?: string }).stderr ?? '');

			throw new GitCommandError(error.message, stderr);
		}

		throw error;
	}
}
