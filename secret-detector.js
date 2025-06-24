const { exec } = require('child_process');

function scanForSecretsAndReturnReport(scanDir, repoName) {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const reportFileName = `${repoName}_${timestamp}_report.json`;
        const command = `gitleaks dir ${scanDir} -r ${reportFileName} --no-banner`;

        console.log(`🔍 Running gitleaks command: ${command}`); // Add this line to see the command
        exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error executing gitleaks: ${stderr}`); // Detailed error
                return reject(error);
            }

            console.log(`✅ Gitleaks scan completed. Report saved as: ${reportFileName}`);
            resolve(reportFileName);
        });
    });
}

module.exports = async function () {
    const scanDir = '.'; // Current directory
    const repoName = 'github-action'; // Or any name you prefer
    try {
        const report = await scanForSecretsAndReturnReport(scanDir, repoName);
        console.log(`🔍 Secret scan report: ${report}`);
    } catch (err) {
        console.error("❌ Error during secret scan:", err);
    }
};
