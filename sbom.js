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
    console.error('❌ No supported manifest file found in the project.');
    process.exit(1);
  }

  console.log('🛠️ Supported manifest file found. Running cdxgen...');

  const cdxgenArgs = [projectPath, '-o', sbomPath];
  const child = spawn('cdxgen', cdxgenArgs);

  child.stdout.on('data', (data) => console.log(`cdxgen stdout: ${data}`));
  child.stderr.on('data', (data) => console.error(`cdxgen stderr: ${data}`));

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
    await fsPromises.access(sbomPath);
    console.log(`✅ SBOM file found at ${sbomPath}`);
     const stats = fs.statSync(sbomPath);
    const sbomSizeInMB = stats.size / (1024 * 1024); // Convert bytes to MB
    console.log(`📄 SBOM file size: ${sbomSizeInMB.toFixed(2)} MB`);

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
      console.error('❌ WORKSPACE_ID or PROJECT_ID environment variables are missing.');
      process.exit(1);
    }

    const apiUrl = `${apiUrlBase}/${workspaceId}/${projectId}/update-sbom`;
    console.log('📤 Uploading SBOM to API:', apiUrl);

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
      timeout: 120000 // optional: 60s timeout
    });

    if (response.status >= 200 && response.status < 300) {
      console.log('✅ SBOM uploaded successfully:', response.data);
    } else {
      console.error('❌ Failed to upload SBOM. Status:', response.status);
      console.error('Response body:', response.data);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Failed to process or upload SBOM', err);
    process.exit(1);
  }
}

module.exports = uploadSBOM;
