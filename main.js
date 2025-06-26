const core = require('@actions/core');

(async () => {
  try {
    console.log("🚀 Starting main process...");

    // Fetch the input scan types (could be 'secrets', 'sca', or 'configs')
    const scanTypes = core.getInput('scan_types').split(','); // Example: ["secrets", "sca", "configs"]
    console.log("Scan types:", scanTypes);

      // If 'sca' is in scanTypes, run the SBOM (SCA) scanner
      if (scanTypes.includes('sca')) {
        console.log("🔍 Running SBOM (SCA) Scanner...");
        await require('./sbom')(); // Run SBOM or SCA tool
      }

      // If 'secrets' is in scanTypes, run the Secret Detector
      if (scanTypes.includes('secrets')) {
        console.log("🔍 Running Secret Detector...");
        await require('./secret-detector')(); // Run secret detector (e.g., Gitleaks)
      }
    

    // If 'configs' is in scanTypes, run the Config Scanner (if this feature is added later)
    // if (scanTypes.includes('configs')) {
    //   console.log("🔍 Running Config Scanner...");
    //   await require('./config-scanner')(); // Replace with your config scanner
    // }

    console.log("✅ Main process completed.");
  } catch (err) {
    console.error("❌ Error in main.js:", err); // Log the entire error object for better debugging
    process.exit(1); // Exit with error code
  }
})();
