const { spawn } = require('child_process');
const fs = require('fs'); // Standard fs for createReadStream
const fsPromises = require('fs').promises; // fs.promises for async operations
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const projectId = 'd0b69d2c-2aed-455a-a0e8-6ba8ae516c58';
const apiKey = '0a4b5065-1a73-45bf-aef3-eb4f14e94fdc';
const secretKey = 'q3Y2mjMh2-Vd67Z3j0y0D0nwoA-vAUbYwBT-HW5Z34Y';
const tenantKey = '4fbcdc76-6d31-4094-b630-7852ca7ea654';
const apiUrl = 'https://beta.neotrak.io/open-pulse/project/update-with-file';
const sbomPath = path.resolve('/github/workspace/sbom-new.json');
const projectPath = process.env["GITHUB_WORKSPACE"];


async function uploadSBOM() {
  // Run cdxgen command to generate SBOM
  const child = spawn('cdxgen', [projectPath, '-o', '/github/workspace/sbom-new.json']);

  child.stdout.on('data', (data) => {
    console.log(`Stdout: ${data}`);
  });

  child.stderr.on('data', (data) => {
    console.error(`Stderr: ${data}`);
  });

  await new Promise((resolve, reject) => {
    child.on('exit', (code) => {
      if (code === 0) {
        console.log('✅ cdxgen completed successfully.');
        resolve();
      } else {
        reject(new Error(`cdxgen failed with exit code ${code}`));
      }
    });
  });

  try {
    // Check if SBOM file exists
    await fsPromises.access(sbomPath);
    console.log(`✅ SBOM file found at ${sbomPath}`);

    // Prepare form data for API upload
    const form = new FormData();
    form.append('projectId', projectId);
    form.append('sbomFile', fs.createReadStream(sbomPath));
    form.append('displayName', 'sbom');

    console.log('📤 Uploading SBOM to new API...');

    // Upload to new API
    const response = await axios.post(apiUrl, form, {
      headers: {
        ...form.getHeaders(),
        'x-api-key': apiKey,
        'x-secret-key': secretKey,
        'x-tenant-key': tenantKey,
      },
    });

    console.log('✅ SBOM uploaded successfully:', response.data);
  } catch (err) {
    console.error('❌ Failed to process or upload SBOM:', err.message);
    process.exit(1);
  }
}

module.exports = uploadSBOM;





