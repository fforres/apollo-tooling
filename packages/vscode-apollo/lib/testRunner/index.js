"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jest_1 = require("jest");
const path_1 = require("path");
const jest_config_1 = require("./jest-config");
async function run(_testRoot, callback) {
  const writeStreamRefs = forwardWriteStreams();
  try {
    const testDirectory = path_1.resolve(__dirname, "..", "..", "src");
    const { results } = await jest_1.runCLI(jest_config_1.config, [
      testDirectory
    ]);
    restoreWriteStreams(writeStreamRefs);
    const failures = collectTestFailureMessages(results);
    if (failures.length > 0) {
      callback(null, failures);
      process.exit(1);
    }
    callback(null);
  } catch (e) {
    callback(e);
    process.exit(1);
  }
}
exports.run = run;
function collectTestFailureMessages(results) {
  const failures = results.testResults.reduce((acc, testResult) => {
    if (testResult.failureMessage) acc.push(testResult.failureMessage);
    return acc;
  }, []);
  return failures;
}
function forwardWriteStreams() {
  const outRef = process.stdout.write;
  const errRef = process.stderr.write;
  process.stdout.write = logger;
  process.stderr.write = logger;
  return { outRef, errRef };
}
function restoreWriteStreams(refs) {
  process.stdout.write = refs.outRef;
  process.stderr.write = refs.errRef;
}
function logger(line) {
  console.log(line);
  return true;
}
//# sourceMappingURL=index.js.map
