const { spawn } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const workspaceId = process.env.WORKSPACE_ID;
const projectId = process.env.PROJECT_ID;
const apiKey = process.env.X_API_KEY;
const secretKey = process.env.X_SECRET_KEY;
const tenantKey = process.env.X_TENANT_KEY;

const apiUrlBase = 'https://dev.neotrak.io/open-pulse/project';
const sbomPath = path.resolve('/github/workspace/sbom-new.json');
const projectPath = process.env["GITHUB_WORKSPACE"] || "/github/workspace";

const isDebugMode = process.env.DEBUG_MODE === 'false';

function logDebug(message) {
  if (isDebugMode) {
    console.log(message);
  }
}

function logError(...args) {
  console.error(...args);
}

console.log('Project Path:', projectPath);

function hasManifestFile(projectPath) {
  const manifests = [
    'package.json',
    'pom.xml',
    'build.gradle',
    'requirements.txt',
    '.csproj'
  ];

  return manifests.some(file => fs.existsSync(path.join(projectPath, file)));
}

async function uploadSBOM() {
  if (!hasManifestFile(projectPath)) {
    logError('❌ No supported manifest file found in the project.');
    process.exit(1);
  }

  logDebug('🛠️ Supported manifest file found. Running cdxgen...');

  const cdxgenArgs = [projectPath, '-o', sbomPath];
  const child = spawn('cdxgen', cdxgenArgs);

  child.stdout.on('data', (data) => logDebug(`cdxgen stdout: ${data}`));
  child.stderr.on('data', (data) => logError(`cdxgen stderr: ${data}`));

  await new Promise((resolve, reject) => {
    child.on('exit', (code) => {
      if (code === 0) {
        logDebug('✅ cdxgen completed successfully.');
        resolve();
      } else {
        reject(new Error(`cdxgen failed with exit code ${code}`));
      }
    });
  });

  try {
    await fsPromises.access(sbomPath);
    logDebug(`✅ SBOM file found at ${sbomPath}`);
     const stats = fs.statSync(sbomPath);
    const sbomSizeInMB = stats.size / (1024 * 1024); // Convert bytes to MB
    logDebug(`📄 SBOM file size: ${sbomSizeInMB.toFixed(2)} MB`);

    const form = new FormData({ maxDataSize: 10 * 1024 * 1024 }); // 10MB
    form.append('sbomFile', fs.createReadStream(sbomPath));
    form.append('displayName', process.env.DISPLAY_NAME || 'sbom');

    let branchName = process.env.GITHUB_REF_NAME;
    if (!branchName) {
      try {
        const { execSync } = require('child_process');
        branchName = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
      } catch (e) {
        branchName = 'main';
      }
    }
    form.append('branchName', branchName);

    if (!workspaceId || !projectId) {
      logError('❌ WORKSPACE_ID or PROJECT_ID environment variables are missing.');
      process.exit(1);
    }

    const apiUrl = `${apiUrlBase}/${workspaceId}/${projectId}/update-sbom`;
    logDebug('📤 Uploading SBOM to API:', apiUrl);

    const headers = {
      ...form.getHeaders(),
    };
    if (apiKey) headers['x-api-key'] = apiKey;
    if (secretKey) headers['x-secret-key'] = secretKey;
    if (tenantKey) headers['x-tenant-key'] = tenantKey;

    // const response = await axios.post(apiUrl, form, { headers });

    const response = await axios.post(apiUrl, form, {
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000 // optional: 60s timeout
    });

    if (response.status >= 200 && response.status < 300) {
      logDebug('✅ SBOM uploaded successfully:', response.data);
    } else {
      logError('❌ Failed to upload SBOM. Status:', response.status);
      logError('Response body:', response.data);
      process.exit(1);
    }
  } catch (err) {
    logError('❌ Failed to process or upload SBOM', err);
    process.exit(1);
  }
}

module.exports = uploadSBOM;
