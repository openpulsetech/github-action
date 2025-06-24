const { exec } = require('child_process');

function scanForSecretsAndReturnReport(scanDir, repoName) {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const reportFileName = `${repoName}_${timestamp}_report.json`;
        const reportFilePath = path.resolve(scanDir, reportFileName);

        const command = `gitleaks dir ${scanDir} -r ${reportFileName} --no-banner`;

        console.log(`🔍 Running gitleaks command: ${command}`); // Add this line to see the command
        exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error executing gitleaks: ${stderr}`); // Detailed error
                return reject(error);
            }

            console.log(`✅ Gitleaks scan completed. Report saved as: ${reportFileName}`);
            console.log(`📁 Full report file path: ${reportFilePath}`);
            resolve(reportFileName);
        });
    });
}

module.exports = async function () {
    const scanDir = '.'; // Current directory
    // const repoName = 'github-action'; // Or any name you prefer
    const repoName = process.env.GITHUB_REPOSITORY.split('/')[1] || 'github-action';
    try {
        const report = await scanForSecretsAndReturnReport(scanDir, repoName);
        console.log(`🔍 Secret scan report: ${report}`);
         console.log(`🔍 Secret scan report path: ${reportPath}`);
    } catch (err) {
        console.error("❌ Error during secret scan:", err);
    }
};
