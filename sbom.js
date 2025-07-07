const { spawn } = require('child_process');
const fs = require('fs'); // For createReadStream
const fsPromises = require('fs').promises; // For async fs operations
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const workspaceId = process.env.WORKSPACE_ID;
const projectId = process.env.PROJECT_ID;
const apiKey = process.env.X_API_KEY;
const secretKey = process.env.X_SECRET_KEY;
const tenantKey = process.env.X_TENANT_KEY;

const apiUrlBase = 'http://dev.neotrak.io/open-pulse/project';
const sbomPath = path.resolve('/github/workspace/sbom-new.json');
const projectPath = process.env["GITHUB_WORKSPACE"];  // This is the root path of the repo

console.log('Project Path:', projectPath);

// Function to print the directory structure of the external project
function printDirStructure(dir, level = 0) {
  if (level >= 3) return; // Limit to 3 levels

  const files = fs.readdirSync(dir, { withFileTypes: true });

  files.forEach(file => {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      console.log('📁', fullPath);  // Print directory
      printDirStructure(fullPath, level + 1); // Recursively print subdirectories (up to 3 levels)
    } else {
      console.log('📄', fullPath);  // Print file
    }
  });
}

// Print the directory structure of the external project
console.log('🔍 Project Directory Structure:');
printDirStructure(projectPath);

async function uploadSBOM() {
  // Path to the package.json file (or any specific file you'd like to analyze)
  const packageJsonPath = path.join(projectPath, 'package.json');
  
  // Ensure the package.json file exists before proceeding
  if (!fs.existsSync(packageJsonPath)) {
    console.error(`❌ package.json not found at ${packageJsonPath}`);
    process.exit(1);
  }

  // Run cdxgen to generate the SBOM for the Node.js project
  const child = spawn('cdxgen', [projectPath, '-o', sbomPath, '--type', 'nodejs']); 

  child.stdout.on('data', (data) => {
    console.log(`cdxgen stdout: ${data}`);
  });

  child.stderr.on('data', (data) => {
    console.error(`cdxgen stderr: ${data}`);
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

    // Prepare form data for upload
    const form = new FormData();
    form.append('sbomFile', fs.createReadStream(sbomPath));
    form.append('displayName', process.env.DISPLAY_NAME || 'sbom');

    // Determine the branch name
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

    // Ensure necessary environment variables exist
    if (!workspaceId || !projectId) {
      console.error('❌ WORKSPACE_ID or PROJECT_ID environment variables are missing.');
      process.exit(1);
    }

    const apiUrl = `${apiUrlBase}/${workspaceId}/${projectId}/update-sbom`;
    console.log('📤 Uploading SBOM to API:', apiUrl);

    // Set headers for the upload request
    const headers = {
      ...form.getHeaders(),
    };
    if (apiKey) headers['x-api-key'] = apiKey;
    if (secretKey) headers['x-secret-key'] = secretKey;
    if (tenantKey) headers['x-tenant-key'] = tenantKey;

    // Upload the SBOM
    const response = await axios.post(apiUrl, form, { headers });

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
// const projectPath = process.env["GITHUB_WORKSPACE"];
// console.log('Project Path:', projectPath);

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
//   // Run cdxgen command to generate SBOM
//   // const child = spawn('cdxgen', [projectPath, '-o', sbomPath]);
//  const child = spawn('cdxgen', [projectPath, '-o', sbomPath, '--type', 'nodejs']); 

//   child.stdout.on('data', (data) => {
//     console.log(`Stdout: ${data}`);
//   });

//   child.stderr.on('data', (data) => {
//     console.error(`Stderr: ${data}`);
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

//     // Prepare form data
//     const form = new FormData();
//     form.append('sbomFile', fs.createReadStream(sbomPath));
//     form.append('displayName', process.env.DISPLAY_NAME || 'sbom');

//     // Determine branch name
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
//       console.log('WORKSPACE_ID:', workspaceId, 'PROJECT_ID:', projectId);
//       console.log('All env:', process.env);
//       process.exit(1);
//     }
//     console.log("Env Variables:", {
//       WORKSPACE_ID: process.env.WORKSPACE_ID?.substring(0, 6),
//        WORKSPACE_IDLength: process.env.WORKSPACE_ID?.length,
//       PROJECT_ID: process.env.PROJECT_ID,
//       API_URL_BASE: process.env.API_URL_BASE,
//       X_API_KEY: process.env.X_API_KEY,
//       X_SECRET_KEY: process.env.X_SECRET_KEY,
//       X_TENANT_KEY: process.env.X_TENANT_KEY
//     });


//     const apiUrl = `${apiUrlBase}/${workspaceId}/${projectId}/update-sbom`;
//     console.log('📤 Uploading SBOM to API:', apiUrl);

//     // Set headers
//     const headers = {
//       ...form.getHeaders(),
//     };
//     if (apiKey) headers['x-api-key'] = apiKey;
//     if (secretKey) headers['x-secret-key'] = secretKey;
//     if (tenantKey) headers['x-tenant-key'] = tenantKey;

//     const response = await axios.post(apiUrl, form, {
//       headers,
//       validateStatus: () => true, // Always resolve to inspect body even on failure
//     });

//     if (response.status >= 200 && response.status < 300) {
//       console.log('✅ SBOM uploaded successfully:', response.data);
//     } else {
//       console.error('❌ Failed to upload SBOM. Status:', response.status);
//       console.error('Response body:', response.data);
//       process.exit(1);
//     }
//   } catch (err) {
//     console.error('❌ Failed to process or upload SBOM');

//     if (err.response) {
//       console.error('❌ Server responded with an error:');
//       console.error('Status:', err.response.status);
//       console.error('Headers:', err.response.headers);
//       console.error('Data:', err.response.data);
//     } else if (err.request) {
//       console.error('❌ No response received from server.');
//       console.error('Request details:', err.request);
//     } else {
//       console.error('❌ Error Message:', err.message);
//     }

//     console.error('🔍 Stack Trace:', err.stack);
//     process.exit(1);
//   }
// }

// module.exports = uploadSBOM;