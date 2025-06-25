
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Define custom rules inline
const gitleaksRules = `
[[rules]]
id = "generic-password"
description = "Hardcoded password assignment"
regex = '''(?i)(password|passwd|pwd)\\s*=\\s*["'].*?["']'''
tags = ["key", "password"]

[[rules]]
id = "aws-secret-access-key"
description = "AWS Secret Access Key"
regex = '''AKIA[0-9A-Z]{16}'''
tags = ["key", "AWS"]
`;

function createTempRulesFile() {
  const tempPath = path.join(os.tmpdir(), 'gitleaks-inline-rules.toml');
  fs.writeFileSync(tempPath, gitleaksRules);
  return tempPath;
}

function runGitleaks(scanDir, reportPath, rulesPath) {
  return new Promise((resolve, reject) => {
    const command = `gitleaks detect --source=${scanDir} --report-path=${reportPath} --config=${rulesPath} --no-banner`;

    console.log(`🔍 Running Gitleaks:\n${command}`);
    exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
      console.log(`📤 Gitleaks STDOUT:\n${stdout}`);
      if (stderr) console.log(`⚠️ Gitleaks STDERR:\n${stderr}`);
      if (error) return reject(new Error(`Gitleaks failed: ${error.message}`));
      resolve();
    });
  });
}

function checkReport(reportPath) {
  return new Promise((resolve, reject) => {
    fs.readFile(reportPath, 'utf8', (err, data) => {
      if (err) return reject(new Error(`Failed to read report: ${err.message}`));
      try {
        const json = JSON.parse(data);
        resolve(json.length > 0 ? json : "No secrets detected.");
      } catch (e) {
        reject(new Error(`Invalid report format: ${e.message}`));
      }
    });
  });
}

module.exports = async function () {
  const scanDir = process.env.GITHUB_WORKSPACE || path.resolve(__dirname, '..');
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'repo';
  const timestamp = Date.now();
  const reportPath = path.join(scanDir, `${repoName}_${timestamp}_report.json`);
  const rulesPath = createTempRulesFile();

  console.log(`📂 Scanning directory: ${scanDir}`);
  console.log(`📝 Rules file created at: ${rulesPath}`);

  try {
    await runGitleaks(scanDir, reportPath, rulesPath);
    const result = await checkReport(reportPath);

    if (result === "No secrets detected.") {
      console.log("✅ No secrets detected.");
    } else {
      console.log("🔐 Secrets detected:");
      console.dir(result, { depth: null });
      process.exitCode = 1; // Optional: fail the action
    }
  } catch (err) {
    console.error("❌ Secret scan error:", err.message);
    process.exit(1);
  } finally {
    if (fs.existsSync(rulesPath)) fs.unlinkSync(rulesPath); // cleanup
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









