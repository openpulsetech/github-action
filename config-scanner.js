const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const scanDir = process.env.GITHUB_WORKSPACE || process.cwd();
const reportPath = path.join(scanDir, `trivy_config_report_${Date.now()}.json`);
const debug = process.env.DEBUG_MODE === 'true';

// 🔒 Required secrets (pass via GitHub Secrets)
const apiKey = process.env.X_API_KEY;
const secretKey = process.env.X_SECRET_KEY;
const tenantKey = process.env.X_TENANT_KEY;
const projectId = process.env.PROJECT_ID;

const apiUrl = `https://dev.neoTrak.io/open-pulse/project/update-configs/${projectId}`;

// Utility logging
function log(...args) {
  if (debug) console.log(...args);
}

function warn(...args) {
  if (debug) console.warn(...args);
}

// Run Trivy config scan
function runTrivyScan() {
  return new Promise((resolve, reject) => {
    const command = `trivy config --format json --output ${reportPath} ${scanDir}`;
    log(`🔍 Running Trivy config scan:\n${command}`);

    exec(command, { shell: '/bin/bash', maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (stderr && stderr.trim()) warn('⚠️ STDERR:\n', stderr);
      if (error) {
        return reject(new Error(`❌ Trivy scan failed: ${error.message}`));
      }
      resolve();
    });
  });
}

// Parse Trivy JSON report
function parseReport() {
  return new Promise((resolve, reject) => {
    fs.readFile(reportPath, 'utf8', (err, data) => {
      if (err) return reject(err);

      try {
        const report = JSON.parse(data);
        const results = Array.isArray(report.Results) ? report.Results : [];

        const structured = {
          ArtifactName: report.ArtifactName || 'unknown-artifact',
          ArtifactType: report.ArtifactType || 'config',
          Results: results.map(result => ({
            Target: result.Target,
            Class: result.Class,
            Type: result.Type,
            Misconfigurations: (result.Misconfigurations || []).map(m => ({
              ID: m.ID,
              Title: m.Title,
              Description: m.Description,
              Severity: m.Severity,
              PrimaryURL: m.PrimaryURL,
              Query: m.Query
            }))
          }))
        };

        resolve(structured);
      } catch (e) {
        reject(new Error(`❌ Failed to parse Trivy report JSON: ${e.message}`));
      }
    });
  });
}

// Send report to API
async function sendToAPI(payload) {
  if (!apiKey || !secretKey || !tenantKey || !projectId) {
    console.error("❌ Missing API credentials or project ID.");
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-API-KEY': apiKey,
    'X-SECRET-KEY': secretKey,
    'X-TENANT-KEY': tenantKey,
  };

  try {
    const response = await axios.post(apiUrl, payload, { headers });
    console.log(`✅ Config report successfully sent. Status: ${response.status}`);
  } catch (error) {
    if (error.response) {
      console.error('❌ API responded with an error:', error.response.status, error.response.statusText);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('❌ No response received from API. Request details:', error.request);
    } else {
      console.error('❌ Error setting up API request:', error.message);
    }
    process.exit(1);
  }
}

// Cleanup report file
function cleanUp() {
  try {
    if (fs.existsSync(reportPath)) {
      fs.unlinkSync(reportPath);
      log(`🧹 Removed temp report file: ${reportPath}`);
    }
  } catch (e) {
    warn(`⚠️ Failed to delete report file: ${e.message}`);
  }
}

// ✅ Exported async function (main entry point)
module.exports = async function () {
  try {
    await runTrivyScan();
    const report = await parseReport();

    console.log('📦 Trivy Config Scan Result:');
    console.log(JSON.stringify(report, null, 2));

    await sendToAPI(report);

    const flatIssues = report.Results.flatMap(r => r.Misconfigurations || []);
    if (flatIssues.some(i => i.Severity === 'CRITICAL')) {
      console.error("❌ Critical misconfigurations found.");
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  } finally {
    cleanUp();
  }
};
