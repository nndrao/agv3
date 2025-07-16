import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function launchOpenFin() {
  try {
    console.log('Launching OpenFin...');
    
    const manifestUrl = 'http://localhost:5173/manifest.json';
    const openfinCli = path.join(__dirname, '..', 'node_modules', '.bin', 'openfin');
    
    const openfinProcess = spawn(openfinCli, [
      '--launch',
      '--config',
      manifestUrl
    ], {
      stdio: 'inherit',
      shell: true
    });
    
    openfinProcess.on('error', (error) => {
      console.error('Failed to launch OpenFin:', error);
      process.exit(1);
    });
    
    openfinProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(`OpenFin exited with code ${code}`);
        process.exit(code);
      }
    });
    
  } catch (error) {
    console.error('Failed to launch OpenFin:', error);
    process.exit(1);
  }
}

launchOpenFin();