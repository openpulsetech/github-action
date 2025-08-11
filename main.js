const core = require('@actions/core');

// Custom logDebug function to wrap core.debug and check the environment variable
function logDebug(message) {
  const debugMode = process.env.DEBUG_MODE === 'true'; // Check if DEBUG_MODE is 'true'
  if (debugMode) {
    core.debug(message); // Print debug message only if DEBUG_MODE is true
  }
}

(async () => {
  try {
    logDebug("🚀 Starting main process...");

    // Fetch the input scan types (could be 'secrets', 'sca', or 'configs')
    const scanTypes = core.getInput('scan_types').split(','); // Example: ["secrets", "sca", "configs"]
    logDebug("Scan types: " + scanTypes);

    // Debug log for checking environment variables and inputs
    logDebug("Debug: GITHUB_REF_NAME = " + process.env.GITHUB_REF_NAME);
    logDebug("Debug: Inputs fetched from GitHub: " + scanTypes);
    console.log("Debug: Inputs fetched from GitHub:", scanTypes);

    // If 'sca' is in scanTypes, run the SBOM (SCA) scanner
    if (scanTypes.includes('sca')) {
      logDebug("🔍 Running SBOM (SCA) Scanner...");
      await require('./sbom')(); // Run SBOM or SCA tool
      logDebug("Debug: SBOM scan completed.");
    }

    // If 'secrets' is in scanTypes, run the Secret Detector
    if (scanTypes.includes('secrets')) {
      logDebug("🔍 Running Secret Detector...");
      await require('./secret-detector')(); // Run secret detector (e.g., Gitleaks)
      logDebug("Debug: Secret scan completed.");
    }

    // If 'configs' is in scanTypes, run the Config Scanner (if this feature is added later)
    // if (scanTypes.includes('configs')) {
    //   logDebug("🔍 Running Config Scanner...");
    //   await require('./config-scanner')(); // Replace with your config scanner
    //   logDebug("Debug: Config scan completed.");
    // }

    // Fetch the branch name for debug logging
    const branchName = process.env.GITHUB_REF_NAME;
    logDebug("Branch name: " + branchName);

    logDebug("✅ Main process completed.");
  } catch (err) {
    core.error("❌ Error in main.js: " + err); // Log the entire error object for better debugging
    process.exit(1); // Exit with error code
  }
})();





// const core = require('@actions/core');

// (async () => {
//   try {
//     console.log("🚀 Starting main process...");

//     // Fetch the input scan types (could be 'secrets', 'sca', or 'configs')
//     const scanTypes = core.getInput('scan_types').split(','); // Example: ["secrets", "sca", "configs"]
//     console.log("Scan types:", scanTypes);

//       // If 'sca' is in scanTypes, run the SBOM (SCA) scanner
//       if (scanTypes.includes('sca')) {
//         console.log("🔍 Running SBOM (SCA) Scanner...");
//         await require('./sbom')(); // Run SBOM or SCA tool
//       }

//       // If 'secrets' is in scanTypes, run the Secret Detector
//       if (scanTypes.includes('secrets')) {
//         console.log("🔍 Running Secret Detector...");
//         await require('./secret-detector')(); // Run secret detector (e.g., Gitleaks)
//       }
    

//     // If 'configs' is in scanTypes, run the Config Scanner (if this feature is added later)
//     // if (scanTypes.includes('configs')) {
//     //   console.log("🔍 Running Config Scanner...");
//     //   await require('./config-scanner')(); // Replace with your config scanner
//     // }

//     const branchName = process.env.GITHUB_REF_NAME;
//     console.log("Branch name:", branchName);

//     console.log("✅ Main process completed.");
//   } catch (err) {
//     console.error("❌ Error in main.js:", err); // Log the entire error object for better debugging
//     process.exit(1); // Exit with error code
//   }
// })();
