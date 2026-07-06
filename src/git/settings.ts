import * as vscode from 'vscode';
import { DiffRangeMode } from '../types';
import { readDiffRangeModeFromConfig } from './changedFiles';

const CONFIG_SECTION = 'gitCompareRefOpen';
const DEFAULT_DIFF_RANGE_KEY = 'defaultDiffRange';

export function getDefaultDiffRangeMode(): DiffRangeMode {
	const configuration = vscode.workspace.getConfiguration(CONFIG_SECTION);
	const configuredValue = configuration.get<string>(DEFAULT_DIFF_RANGE_KEY);

	return readDiffRangeModeFromConfig(configuredValue);
}
