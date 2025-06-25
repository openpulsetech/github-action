const { exec, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

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
    console.log(`🔍 Running Gitleaks:\n${command}`);

    exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
      console.log('📤 Gitleaks STDOUT:\n', stdout);
      if (stderr && stderr.trim()) {
        console.warn('⚠️ Gitleaks STDERR:\n', stderr);
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

module.exports = async function () {
  try {
    const scanDir = process.env.GITHUB_WORKSPACE || '/github/workspace';
    const repoName = (process.env.GITHUB_REPOSITORY || 'repo/unknown').split('/')[1];
    const reportPath = path.join(scanDir, `${repoName}_${Date.now()}_report.json`);
    const rulesPath = createTempRulesFile();

    console.log(`📂 Scanning directory: ${scanDir}`);
    console.log(`📝 Using custom inline rules from: ${rulesPath}`);

    // Set GIT safe directory for Docker/GitHub context
    try {
      execSync(`git config --global --add safe.directory "${scanDir}"`);
    } catch (e) {
      console.warn("⚠️ Could not configure Git safe directory (not a git repo?)");
    }

    await runGitleaks(scanDir, reportPath, rulesPath);
    const result = await checkReport(reportPath);

    if (result === "No secrets detected.") {
      console.log("✅ No secrets detected.");
    } else {
      console.log("🔐 Secrets detected:");
      console.dir(result, { depth: null, colors: true });
      process.exitCode = 1; // Fail GitHub Action
    }

    fs.unlinkSync(rulesPath); // Cleanup
  } catch (err) {
    console.error("❌ Error during secret scan:", err.message);
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









