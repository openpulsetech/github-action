const { spawn } = require('child_process');
const fs = require('fs'); // Standard fs for createReadStream
const fsPromises = require('fs').promises; // fs.promises for async operations
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const projectId = process.env.PROJECT_ID;
const secretKey = process.env.SECRET_KEY;
const apiUrl = 'http://64.227.149.25:8081/api/v1/bom';
const sbomPath = path.resolve('/github/workspace/sbom-new.json');
const projectPath = process.env["GITHUB_WORKSPACE"];


async function uploadSBOM() {
  // Validate environment variables
  if (!projectId || !secretKey) {
    console.error('❌ PROJECT_ID or SECRET_KEY environment variables are missing.');
    process.exit(1);
  }

  // Run cdxgen command
  const child = spawn('cdxgen', [projectPath, '-o', '/github/workspace/sbom-new.json']);

  // Handle child process output and errors
  child.stdout.on('data', (data) => {
    console.log(`Stdout: ${data}`);
  });

  child.stderr.on('data', (data) => {
    console.error(`Stderr: ${data}`);
  });

  // Wait for child process to complete
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

    // Read file (optional, for logging purposes)
    const sbomContent = await fsPromises.readFile(sbomPath, 'utf8');
    console.log('SBOM content:', sbomContent);

    // Prepare form data for API upload
    const form = new FormData();
    form.append('project', projectId);
    form.append('bom', fs.createReadStream(sbomPath)); // Use standard fs for createReadStream

    console.log('📤 Uploading SBOM to API...');

    // Upload to API
    const response = await axios.post(apiUrl, form, {
      headers: {
        ...form.getHeaders(),
        'x-api-key': secretKey,
      },
    });

    console.log('✅ SBOM uploaded successfully:', response.data);
    process.exit(0); // Success
  } catch (err) {
    console.error('❌ Failed to process or upload SBOM:', err.message);
    process.exit(1); // Failure
  }
}

uploadSBOM().catch((err) => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
module.exports = uploadSBOM;





