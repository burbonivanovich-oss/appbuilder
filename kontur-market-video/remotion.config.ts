import {Config} from '@remotion/cli/config';
Config.setBrowserExecutable(process.env.REMOTION_CHROME ?? null);
