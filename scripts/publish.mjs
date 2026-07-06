import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function run(command) {
	execSync(command, { stdio: 'inherit' });
}

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
const version = packageJson.version;
const vsixPath = `git-compare-ref-open-${version}.vsix`;

if (process.env.OVSX_PAT) {
	run(`pnpm exec ovsx publish "${vsixPath}" --pat "${process.env.OVSX_PAT}"`);
}

if (process.env.VSCE_PAT) {
	run(`pnpm exec vsce publish --packagePath "${vsixPath}" --pat "${process.env.VSCE_PAT}"`);
}
