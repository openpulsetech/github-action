(async () => {
  try {
    console.log("🚀 Starting main process...");

    // Import and run the sbom upload logic
    await require('./sbom')(); // Immediately invoke the exported function
     
    // secret detector
    try {
      console.log("🔍 Starting secret detector...");
      await require('./secret-detector')();
      console.log("✅ Secret detector ran successfully.");
    } catch (err) {
      console.error("❌ Failed to run secret-detector:", err);
    }

    console.log("✅ Main process completed.");
  } catch (err) {
    console.error("❌ Error in main.js:", err.message);
    process.exit(1);
  }
})();