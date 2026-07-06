import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function runOrWarn(label, command) {
	try {
		execSync(command, { stdio: 'inherit' });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`${label} failed (release will continue): ${message}`);
	}
}

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
const version = packageJson.version;
const vsixPath = `git-compare-ref-open-${version}.vsix`;

if (process.env.OVSX_PAT) {
	runOrWarn('Open VSX publish', `pnpm exec ovsx publish "${vsixPath}" --pat "${process.env.OVSX_PAT}"`);
}

if (process.env.VSCE_PAT) {
	runOrWarn(
		'VS Code Marketplace publish',
		`pnpm exec vsce publish --packagePath "${vsixPath}" --pat "${process.env.VSCE_PAT}"`,
	);
}
