(async () => {
  try {
    console.log("🚀 Starting main process...");

    console.log("📤 Calling SBOM upload...");
    await require('./sbom')();
    console.log("📤 SBOM upload finished.");

    console.log("🔍 Calling secret detector...");
    await require('./secret-detector')();
    console.log("🔍 Secret detector finished.");

    console.log("✅ Main process completed.");
  } catch (err) {
    console.error("❌ Error in main.js:", err.message);
    process.exit(1);
  }
})();
