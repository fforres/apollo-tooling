"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const child_process_1 = require("child_process");
const cp = child_process_1.spawn(
  `node ${path_1.resolve(
    process.cwd(),
    "..",
    "..",
    "node_modules",
    "vscode",
    "bin",
    "test"
  )}`,
  [],
  {
    shell: true,
    env: {
      CODE_TESTS_PATH: `${process.cwd()}/lib/testRunner`,
      CODE_TESTS_WORKSPACE: process.cwd(),
      DISPLAY: process.env.DISPLAY
    }
  }
);
cp.stdout.on("data", data => {
  console.log(data.toString());
});
cp.stderr.on("data", err => {});
cp.on("close", code => {
  if (code !== 0) {
    process.exit(code);
  }
});
//# sourceMappingURL=vscode-test-script.js.map
