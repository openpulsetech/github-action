const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function scanForSecretsAndReturnReport(scanDir, repoName) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const reportFileName = `${repoName}_${timestamp}_report.json`;
    const reportFilePath = path.resolve(scanDir, reportFileName);

    // Prepare gitleaks command
    // Using detect mode, specify source dir, output report, no banner
    const command = `gitleaks detect --source=${scanDir} --report-path=${reportFilePath} --no-banner`;

    console.log(`📂 Scanning directory: ${scanDir}`);
    console.log(`📝 Rules file: (default built-in)`);
    console.log(`🔍 Running Gitleaks:\n${command}`);

    exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
      console.log('📤 Gitleaks STDOUT:\n', stdout);
      if (stderr && stderr.trim().length > 0) {
        console.warn('⚠️ Gitleaks STDERR:\n', stderr);
      }

      if (error) {
        console.error('❌ Gitleaks execution error:', error);
        return reject(error);
      }

      console.log(`✅ Gitleaks scan completed. Report saved as: ${reportFileName}`);
      console.log(`📁 Full report file path: ${reportFilePath}`);

      resolve(reportFilePath);
    });
  });
}

async function checkForSecrets(reportFilePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(reportFilePath, 'utf8', (err, data) => {
      if (err) {
        console.error("❌ Error reading report file:", err);
        return reject(err);
      }

      try {
        const report = JSON.parse(data);
        if (!report || report.length === 0) {
          resolve("No secrets detected.");
        } else {
          resolve(report);
        }
      } catch (parseErr) {
        console.error("❌ Error parsing JSON report:", parseErr);
        reject(parseErr);
      }
    });
  });
}

module.exports = async function () {
  try {
    // Fix git "dubious ownership" error for GitHub workspace
    execSync('git config --global --add safe.directory /github/workspace');

    // Scan directory is root of repo, includes src/
    const scanDir = process.env.GITHUB_WORKSPACE || '/github/workspace';

    // Repo name fallback
    const repoName = (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY.split('/')[1]) || 'github-action';

    const reportFilePath = await scanForSecretsAndReturnReport(scanDir, repoName);

    const result = await checkForSecrets(reportFilePath);

    if (result === "No secrets detected.") {
      console.log("✅ No secrets detected.");
    } else {
      console.log("🔐 Secrets detected:");
      console.dir(result, { depth: null, colors: true });

      // Optional: fail action on secrets found
      // process.exitCode = 1;
    }
  } catch (err) {
    console.error("❌ Error during secret scan:", err);
    // Optional: fail action on error
    // process.exitCode = 1;
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









