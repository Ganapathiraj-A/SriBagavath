import { execSync } from 'child_process';
import os from 'os';

const args = process.argv.slice(2).join(' ');
const isWindows = os.platform() === 'win32';

try {
    if (isWindows) {
        execSync(`powershell -ExecutionPolicy Bypass -File ./build.ps1 ${args}`, { stdio: 'inherit' });
    } else {
        execSync(`./build.sh ${args}`, { stdio: 'inherit' });
    }
} catch (error) {
    process.exit(1);
}
