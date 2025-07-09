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

function printDirStructure(dir, level = 0) {
  if (level >= 3) return;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  files.forEach(file => {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      console.log('📁', fullPath);
      printDirStructure(fullPath, level + 1);
    } else {
      console.log('📄', fullPath);
    }
  });
}

console.log('🔍 Project Directory Structure:');
printDirStructure(projectPath);

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
    const sbomContent = fs.readFileSync(sbomPath, 'utf8');
    console.log('📄 SBOM Content:', sbomContent.length);

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
      timeout: 60000 // optional: 60s timeout
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


// const { spawn } = require('child_process');
// const fs = require('fs'); // For createReadStream
// const fsPromises = require('fs').promises; // For async fs operations
// const path = require('path');
// const axios = require('axios');
// const FormData = require('form-data');

// const workspaceId = process.env.WORKSPACE_ID;
// const projectId = process.env.PROJECT_ID;
// const apiKey = process.env.X_API_KEY;
// const secretKey = process.env.X_SECRET_KEY;
// const tenantKey = process.env.X_TENANT_KEY;

// const apiUrlBase = 'http://dev.neotrak.io/open-pulse/project';
// const sbomPath = path.resolve('/github/workspace/sbom-new.json');
// const projectPath = process.env["GITHUB_WORKSPACE"];  // This is the root path of the repo

// console.log('Project Path:', projectPath);

// // Function to print the directory structure of the external project
// function printDirStructure(dir, level = 0) {
//   if (level >= 3) return; // Limit to 3 levels

//   const files = fs.readdirSync(dir, { withFileTypes: true });

//   files.forEach(file => {
//     const fullPath = path.join(dir, file.name);
//     if (file.isDirectory()) {
//       console.log('📁', fullPath);  // Print directory
//       printDirStructure(fullPath, level + 1); // Recursively print subdirectories (up to 3 levels)
//     } else {
//       console.log('📄', fullPath);  // Print file
//     }
//   });
// }

// // Print the directory structure of the external project
// console.log('🔍 Project Directory Structure:');
// printDirStructure(projectPath);

// async function uploadSBOM() {
//   // Path to the package.json file (or any specific file you'd like to analyze)
//   const packageJsonPath = path.join(projectPath, 'package.json');
  
//   // Ensure the package.json file exists before proceeding
//   if (!fs.existsSync(packageJsonPath)) {
//     console.error(`❌ package.json not found at ${packageJsonPath}`);
//     process.exit(1);
//   }

//    // Read and print the content of package.json
//   const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
//   console.log('📄 package.json Content:', packageJsonContent);
  
//   // Run cdxgen to generate the SBOM for the Node.js project
//   // const child = spawn('cdxgen', [projectPath, '-o', sbomPath, '--type', 'nodejs']); 
//   const child = spawn('cdxgen', [projectPath, '-o', sbomPath]); 

//   child.stdout.on('data', (data) => {
//     console.log(`cdxgen stdout: ${data}`);
//   });

//   child.stderr.on('data', (data) => {
//     console.error(`cdxgen stderr: ${data}`);
//   });

//   await new Promise((resolve, reject) => {
//     child.on('exit', (code) => {
//       if (code === 0) {
//         console.log('✅ cdxgen completed successfully.');
//         resolve();
//       } else {
//         reject(new Error(`cdxgen failed with exit code ${code}`));
//       }
//     });
//   });

//   try {
//     // Check if SBOM file exists
//     await fsPromises.access(sbomPath);
//     console.log(`✅ SBOM file found at ${sbomPath}`);

//      const sbomContent = fs.readFileSync(sbomPath, 'utf8');
//     console.log('📄 SBOM Content:', sbomContent);

//     // Prepare form data for upload
//     const form = new FormData();
//     form.append('sbomFile', fs.createReadStream(sbomPath));
//     form.append('displayName', process.env.DISPLAY_NAME || 'sbom');

//     // Determine the branch name
//     let branchName = process.env.GITHUB_REF_NAME;
//     if (!branchName) {
//       try {
//         const { execSync } = require('child_process');
//         branchName = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
//       } catch (e) {
//         branchName = 'main';
//       }
//     }
//     form.append('branchName', branchName);

//     // Ensure necessary environment variables exist
//     if (!workspaceId || !projectId) {
//       console.error('❌ WORKSPACE_ID or PROJECT_ID environment variables are missing.');
//       process.exit(1);
//     }

//     const apiUrl = `${apiUrlBase}/${workspaceId}/${projectId}/update-sbom`;
//     console.log('📤 Uploading SBOM to API:', apiUrl);

//     // Set headers for the upload request
//     const headers = {
//       ...form.getHeaders(),
//     };
//     if (apiKey) headers['x-api-key'] = apiKey;
//     if (secretKey) headers['x-secret-key'] = secretKey;
//     if (tenantKey) headers['x-tenant-key'] = tenantKey;

//     // Upload the SBOM
//     const response = await axios.post(apiUrl, form, { headers });

//     if (response.status >= 200 && response.status < 300) {
//       console.log('✅ SBOM uploaded successfully:', response.data);
//     } else {
//       console.error('❌ Failed to upload SBOM. Status:', response.status);
//       console.error('Response body:', response.data);
//       process.exit(1);
//     }
//   } catch (err) {
//     console.error('❌ Failed to process or upload SBOM', err);
//     process.exit(1);
//   }
// }

// module.exports = uploadSBOM;