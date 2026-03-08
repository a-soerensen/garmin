const fs = require("fs");
const path = require("path");

const repoRoot = __dirname;
const activityDataRoot = path.join(repoRoot, "data", "activity_data");
const activityCoreDir = path.join(activityDataRoot, "activity_core");
const outputFile = path.join(activityDataRoot, "activity_index.json");

function walk(dir, baseDir) {
  let results = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results = results.concat(walk(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      const relative = path.relative(baseDir, fullPath).replace(/\\/g, "/");
      results.push(relative);
    }
  }

  return results;
}

if (!fs.existsSync(activityCoreDir)) {
  console.error("Could not find activity_core directory:");
  console.error(activityCoreDir);
  process.exit(1);
}

const files = walk(activityCoreDir, activityDataRoot).sort();

fs.writeFileSync(outputFile, JSON.stringify(files, null, 2));
console.log(`Wrote ${files.length} entries to ${outputFile}`);