const { exec } = require('child_process');
const fs = require('fs');  // To read the generated report file
const path = require('path');

// Function to scan for secrets
function scanForSecretsAndReturnReport(scanDir, repoName) {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const reportFileName = `${repoName}_${timestamp}_report.json`;
        const reportFilePath = path.resolve(scanDir, reportFileName);

        // Run the gitleaks command
        const command = `gitleaks dir ${scanDir} -r ${reportFileName} --no-banner`;

        console.log(`🔍 Running gitleaks command: ${command}`);
        exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error executing gitleaks: ${stderr}`);
                return reject(error);
            }

            console.log(`✅ Gitleaks scan completed. Report saved as: ${reportFileName}`);
            console.log(`📁 Full report file path: ${reportFilePath}`);
            resolve(reportFilePath);  // Return the path of the generated report
        });
    });
}

// Function to read and check the report for secrets
function checkForSecrets(reportFilePath) {
    return new Promise((resolve, reject) => {
        // Read the report file and check if secrets were found
        fs.readFile(reportFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error("❌ Error reading report file:", err);
                return reject(err);
            }

            const report = JSON.parse(data);  // Assuming the report is in JSON format
            if (report.length === 0) {
                resolve("No secrets detected.");
            } else {
                resolve(report);
            }
        });
    });
}

// Main function to run the secret detection
module.exports = async function () {
    // const scanDir = '.'; // Current directory
    const scanDir = path.resolve(__dirname, 'src'); 
    const repoName = process.env.GITHUB_REPOSITORY.split('/')[1] || 'github-action'; // Get repo name dynamically

    try {
        // Run the scan
        const reportFilePath = await scanForSecretsAndReturnReport(scanDir, repoName);
        console.log("repo name", repoName);
        // Check the report for secrets
        const result = await checkForSecrets(reportFilePath);

        if (result === "No secrets detected.") {
            console.log("✅ No secrets detected.");
        } else {
            console.log("🔍 Secrets detected:", result);
        }
    } catch (err) {
        console.error("❌ Error during secret scan:", err);
    }
};












// const { exec } = require('child_process');
// const path = require('path');

// function scanForSecretsAndReturnReport(scanDir, repoName) {
//     return new Promise((resolve, reject) => {
//         const timestamp = Date.now();
//         const reportFileName = `${repoName}_${timestamp}_report.json`;
//         const reportFilePath = path.resolve(scanDir, reportFileName);

//         const command = `gitleaks dir ${scanDir} -r ${reportFileName} --no-banner`;

//         console.log(`🔍 Running gitleaks command: ${command}`); // Add this line to see the command
//         exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
//             if (error) {
//                 console.error(`❌ Error executing gitleaks: ${stderr}`); // Detailed error
//                 return reject(error);
//             }

//             console.log(`✅ Gitleaks scan completed. Report saved as: ${reportFileName}`);
//             console.log(`📁 Full report file path: ${reportFilePath}`);
//             resolve(reportFileName);
//         });
//     });
// }

// module.exports = async function () {
//     const scanDir = '.'; // Current directory
//     // const repoName = 'github-action'; // Or any name you prefer
//     const repoName = process.env.GITHUB_REPOSITORY.split('/')[1] || 'github-action';
//     try {
//         const report = await scanForSecretsAndReturnReport(scanDir, repoName);
//         console.log(`🔍 Secret scan report: ${report}`);
//          console.log(`🔍 Secret scan report path: ${reportPath}`);
//     } catch (err) {
//         console.error("❌ Error during secret scan:", err);
//     }
// };
