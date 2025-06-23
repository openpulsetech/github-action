(async () => {
  try {
    console.log("🚀 Starting main process...");

    // Import and run the sbom upload logic
    await require('./sbom')(); // Immediately invoke the exported function

    console.log("✅ Main process completed.");
  } catch (err) {
    console.error("❌ Error in main.js:", err.message);
    process.exit(1);
  }
})();
