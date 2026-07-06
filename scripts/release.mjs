import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function run(command) {
	execSync(command, { stdio: 'inherit' });
}

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
const version = packageJson.version;
const vsixPath = `git-compare-ref-open-${version}.vsix`;

run('pnpm run lint');
run('pnpm run test');
run('pnpm run package');

if (process.env.OVSX_PAT) {
	run(`pnpm exec ovsx publish "${vsixPath}" --pat "${process.env.OVSX_PAT}"`);
}

if (process.env.VSCE_PAT) {
	run(`pnpm exec vsce publish --pat "${process.env.VSCE_PAT}"`);
}
