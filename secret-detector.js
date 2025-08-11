const { exec, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const axios = require('axios');

const debugMode = process.env.DEBUG_MODE === 'true';
function log(...args) {
  if (debugMode) console.log(...args);
}
function warn(...args) {
  if (debugMode) console.warn(...args);
}
function error(...args) {
  console.error(...args);
}

// ✅ Stronger regex: avoids matching dummy values like "hello", "test123"
const customRules = `
[[rules]]
id = "strict-secret-detection"
description = "Detect likely passwords or secrets with high entropy"
regex = '''(?i)(password|passwd|pwd|secret|key|token|auth|access)[\\s"']*[=:][\\s"']*["']([A-Za-z0-9@#\\-_$%!]{10,})["']'''
tags = ["key", "secret", "generic", "password"]

[[rules]]
id = "aws-secret"
description = "AWS Secret Access Key"
regex = '''(?i)aws(.{0,20})?(secret|access)?(.{0,20})?['"][0-9a-zA-Z/+]{40}['"]'''
tags = ["aws", "key", "secret"]

[[rules]]
id = "aws-key"
description = "AWS Access Key ID"
regex = '''AKIA[0-9A-Z]{16}'''
tags = ["aws", "key"]

[[rules]]
id = "github-token"
description = "GitHub Personal Access Token"
regex = '''ghp_[A-Za-z0-9_]{36}'''
tags = ["github", "token"]

[[rules]]
id = "jwt"
description = "JSON Web Token"
regex = '''eyJ[A-Za-z0-9-_]+\\.eyJ[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+'''
tags = ["token", "jwt"]

[[rules]]
id = "firebase-api-key"
description = "Firebase API Key"
regex = '''AIza[0-9A-Za-z\\-_]{35}'''
tags = ["firebase", "apikey"]
`;

function createTempRulesFile() {
  const rulesPath = path.join(os.tmpdir(), 'gitleaks-custom-rules.toml');
  fs.writeFileSync(rulesPath, customRules);
  return rulesPath;
}

function runGitleaks(scanDir, reportPath, rulesPath) {
  return new Promise((resolve) => {
    const command = `gitleaks detect --source=${scanDir} --report-path=${reportPath} --config=${rulesPath} --no-banner`;
    log(`🔍 Running Gitleaks:\n${command}`);

    exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
      log('📤 Gitleaks STDOUT:\n', stdout);
      if (stderr && stderr.trim()) {
        warn('⚠️ Gitleaks STDERR:\n', stderr);
      }

      // Still continue even if exit code is 1 (leaks found)
      resolve();
    });
  });
}

function checkReport(reportPath) {
  return new Promise((resolve, reject) => {
    fs.readFile(reportPath, 'utf8', (err, data) => {
      if (err) return reject(err);

      try {
        const report = JSON.parse(data);
        resolve(report.length ? report : "No secrets detected.");
      } catch (e) {
        reject(new Error("Invalid JSON in gitleaks report."));
      }
    });
  });
}

function mapToSBOMSecret(item) {
  return {
    secret_id: item.RuleID,
    description: item.Description,
    secret_value: item.Secret,
    file: item.File,
    start_line: item.StartLine,
    end_line: item.EndLine,
    start_column: item.StartColumn,
    end_column: item.EndColumn,
    match: item.Match,
    component: {
      name: path.basename(item.File),
      version: "unknown",
      type: "source-code",
    },
  };
}

async function sendSecretsToApi(projectId, secretItems) {
  const apiUrl = `https://dev.neoTrak.io/open-pulse/project/update-secrets/${projectId}`;
  const secretsData = secretItems.map(mapToSBOMSecret);

  const headers = {
    'Content-Type': 'application/json',
  };

  const apiKey = process.env.X_API_KEY;
  const secretKey = process.env.X_SECRET_KEY;
  const tenantKey = process.env.X_TENANT_KEY;

  if (apiKey) headers['x-api-key'] = apiKey;
  if (secretKey) headers['x-secret-key'] = secretKey;
  if (tenantKey) headers['x-tenant-key'] = tenantKey;

  try {
    log('Sending secrets:', JSON.stringify(secretsData, null, 2));

    const response = await axios.post(apiUrl, secretsData, {
      headers,
      timeout: 60000,
    });

    if (response.status >= 200 && response.status < 300) {
      log('✅ Secrets updated successfully in SBOM API.');
    } else {
      error(`❌ Failed to update secrets. Status: ${response.status}`);
      error('Response body:', response.data);
    }
  } catch (err) {
    error('❌ Error sending secrets to SBOM API:', err.message || err);
  }
}

module.exports = async function () {
  try {
    const scanDir = process.env.GITHUB_WORKSPACE || '/github/workspace';
    const repoName = (process.env.GITHUB_REPOSITORY || 'repo/unknown').split('/')[1];
    const reportPath = path.join(scanDir, `${repoName}_${Date.now()}_report.json`);
    const rulesPath = createTempRulesFile();

    log(`📂 Scanning directory: ${scanDir}`);
    log(`📝 Using custom inline rules from: ${rulesPath}`);

    // Set GIT safe directory for Docker/GitHub context
    try {
      execSync(`git config --global --add safe.directory "${scanDir}"`);
    } catch (e) {
      warn("⚠️ Could not configure Git safe directory (not a git repo?)");
    }

    await runGitleaks(scanDir, reportPath, rulesPath);
    const result = await checkReport(reportPath);

    // if (result === "No secrets detected.") {
    //   console.log("✅ No secrets detected.");
    // } else {
    //   console.log("🔐 Secrets detected:");
    //   console.dir(result, { depth: null, colors: true });
    //   process.exitCode = 1; // Fail GitHub Action
    // }
    //     fs.unlinkSync(rulesPath); // Cleanup
    //   } catch (err) {
    //     console.error("❌ Error during secret scan:", err.message);
    //     process.exit(1);
    //   }
    // };

    const filtered = Array.isArray(result)
      ? result.filter(item =>
        !skipFiles.includes(path.basename(item.File)) &&
        !item.File.includes('node_modules') &&
        !/["']?\$\{?[A-Z0-9_]+\}?["']?/.test(item.Match)
      )
      : result;

    if (filtered === "No secrets detected." || (Array.isArray(filtered) && filtered.length === 0)) {
      console.log("✅ No secrets detected.");
    } else {
      console.log("🔐 Detected secrets:");
      console.dir(filtered, { depth: null, colors: true });

      const projectId = process.env.PROJECT_ID;
      if (!projectId) {
        console.error("❌ PROJECT_ID environment variable not set.");
        process.exit(1);
      }

      await sendSecretsToApi(projectId, filtered);
      process.exitCode = 1; // Fail the GitHub Action
    }

    fs.unlinkSync(rulesPath);
  } catch (err) {
    console.error("❌ Error during GitHub secrets scan:", err.message || err);
    process.exit(1);
  }
};















// const { exec } = require('child_process');
// const fs = require('fs');  // To read the generated report file
// const path = require('path');

// const printDirectoryContents = async (dir) => {
//   try {
//     const files = await fs.promises.readdir(dir);
//     console.log(`📁 Files in ${dir}:`);
//     files.forEach(file => console.log(` - ${file}`));
//   } catch (err) {
//     console.error(`❌ Error reading directory ${dir}:`, err.message);
//   }
// };

// // Function to scan for secrets
// function scanForSecretsAndReturnReport(scanDir, repoName) {
//     return new Promise((resolve, reject) => {
//         const timestamp = Date.now();
//         const reportFileName = `${repoName}_${timestamp}_report.json`;
//         const reportFilePath = path.resolve(scanDir, reportFileName);

//         // Run the gitleaks command
//         // const command = `gitleaks dir ${scanDir} -r ${reportFileName} --no-banner`;
//         const command = `gitleaks dir ${scanDir} -r ${reportFilePath} --no-banner`;

//         console.log(`🔍 Running gitleaks command: ${command}`);
//         exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
//              console.log(`📤 Gitleaks STDOUT:\n${stdout}`);
//   if (stderr) {
//     console.log(`⚠️ Gitleaks STDERR:\n${stderr}`);
//   }
//             if (error) {
//                 console.error(`❌ Error executing gitleaks: ${stderr}`);
//                 return reject(error);
//             }

//             console.log(`✅ Gitleaks scan completed. Report saved as: ${reportFileName}`);
//             console.log(`📁 Full report file path: ${reportFilePath}`);
//             resolve(reportFilePath);  // Return the path of the generated report
//         });
//     });
// }

// // Function to read and check the report for secrets
// function checkForSecrets(reportFilePath) {
//     return new Promise((resolve, reject) => {
//         // Read the report file and check if secrets were found
//         fs.readFile(reportFilePath, 'utf8', (err, data) => {
//             if (err) {
//                 console.error("❌ Error reading report file:", err);
//                 return reject(err);
//             }

//             const report = JSON.parse(data);  // Assuming the report is in JSON format
//             if (report.length === 0) {
//                 resolve("No secrets detected.");
//             } else {
//                 resolve(report);
//             }
//         });
//     });
// }

// // Main function to run the secret detection
// module.exports = async function () {
//     // const scanDir = '.'; // Current directory
//     // const scanDir = path.resolve(__dirname, 'src');
//     const scanDir = process.env.GITHUB_WORKSPACE;
//     const repoName = process.env.GITHUB_REPOSITORY.split('/')[1] || 'github-action'; // Get repo name dynamically

//     try {
//          console.log("📂 GITHUB_WORKSPACE directory:", scanDir);
//     await printDirectoryContents(scanDir);

//         // Run the scan
//         const reportFilePath = await scanForSecretsAndReturnReport(scanDir, repoName);
//         console.log("repo name", repoName);
//         // Check the report for secrets
//         const result = await checkForSecrets(reportFilePath);

//         if (result === "No secrets detected.") {
//             console.log("✅ No secrets detected.");
//         } else {
//             console.log("🔍 Secrets detected:", result);
//         }
//     } catch (err) {
//         console.error("❌ Error during secret scan:", err);
//     }
// };









