const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Generates a build version based on current date and commit count for today
 * Format: YY.MM.DD.dev/beta/release.1 (e.g., 25.08.17-dev/beta/release.commit)
 * - YY: Last two digits of year
 * - MM: Month (01-12)
 * - DD: Day (01-31)
 * - N: Number of commits today (1-based)
 * - d: Development version (e.g., 25.08.17-dev.1)
 * - b: Beta release (e.g., 25.08.17-beta.1)
 * - r: Release version (e.g., 25.08.17-release.1)
 */
function generateBuildVersion(version) {
  try {
    // Get current date
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    // Get today's date in YYYY-MM-DD format for git log
    const todayStr = [
      now.getFullYear(),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getDate().toString().padStart(2, '0')
    ].join('-');

    // Get commits for today
    let commitCount = 0;
    try {
      const gitCmd = `git log --since="${todayStr} 00:00:00" --until="${todayStr} 23:59:59" --oneline --count`;
      const result = execSync(gitCmd, { encoding: 'utf8', cwd: process.cwd() });

      if (result) {
        console.log(`Git command output: ${result}`);
        commitCount = result.split('\n').length;
      } else {
        console.log('No commits found for today');
      }
    } catch (gitError) {
      console.warn('Warning: Could not get git commit count, using default value 1');
      console.warn('Git error:', gitError.message);
      commitCount = 1; // Default to 1 if git is not available
    }

    // Ensure at least 1 commit for the build
    if (commitCount === 0) {
      commitCount = 1;
    }

    // Generate version string
    const buildVersion = `${year}.${month}.${day}-${version === 'beta' ? 'beta' : version === 'release' ? 'release' : 'dev'}.${commitCount}`;

    return buildVersion;
  } catch (error) {
    console.error('Error generating build version:', error);
    // Fallback version
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}.${month}.${day}.1-commit`;
  }
}

/**
 * Updates the version in package.json
 */
function updatePackageVersion(version) {
  const packagePath = path.join(__dirname, '..', 'package.json');

  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageJson.version = version;

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Updated package.json version to: ${version}`);
    return true;
  } catch (error) {
    console.error('Error updating package.json:', error);
    return false;
  }
}

/**
 * Creates or updates a version.ts file with build information
 */
function createVersionFile(version) {
  const versionFilePath = path.join(__dirname, '..', 'src', 'version.ts');

  const now = new Date();
  const buildDate = now.toISOString();
  const buildTimestamp = now.getTime();

  const versionFileContent = `// Auto-generated version file
// Do not edit manually - this file is updated by scripts/generate-version.js

export const BUILD_VERSION = '${version}';
export const BUILD_DATE = '${buildDate}';
export const BUILD_TIMESTAMP = ${buildTimestamp};
export const BUILD_INFO = {
  version: BUILD_VERSION,
  date: BUILD_DATE,
  timestamp: BUILD_TIMESTAMP,
};

// Helper function to get readable build date
export const getBuildDateString = (): string => {
  return new Date(BUILD_TIMESTAMP).toLocaleDateString();
};

// Helper function to get version display string
export const getVersionDisplayString = (): string => {
  return \`v\${BUILD_VERSION}\`.split('-')[0];
};
`;

  try {
    fs.writeFileSync(versionFilePath, versionFileContent);
    console.log(`Created/updated version file: src/version.ts`);
    return true;
  } catch (error) {
    console.error('Error creating version file:', error);
    return false;
  }
}

/**
 * Main function
 */
function main(version) {
  console.log('Generating build version...');

  const generatedVersion = generateBuildVersion(version);
  console.log(`Generated version: ${generatedVersion}`);

  // Update package.json
  const packageUpdated = updatePackageVersion(generatedVersion);

  // Create version.ts file
  const versionFileCreated = createVersionFile(generatedVersion);

  if (packageUpdated && versionFileCreated) {
    console.log('Build version generation completed successfully!');
    console.log(`Version: ${generatedVersion}`);

    // Output version for potential use by other scripts
    process.stdout.write(generatedVersion);
  } else {
    console.error('Build version generation failed!');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main(process.argv[2]);
}

module.exports = { generateBuildVersion, updatePackageVersion, createVersionFile };
