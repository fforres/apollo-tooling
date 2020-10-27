"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
exports.config = {
  preset: "ts-jest",
  moduleFileExtensions: ["ts", "js"],
  rootDir: path_1.resolve(__dirname, "..", "..", "src"),
  testEnvironment: path_1.resolve(__dirname, "jest-vscode-environment.js"),
  setupFilesAfterEnv: [
    path_1.resolve(__dirname, "jest-vscode-framework-setup.js")
  ],
  globals: {
    "ts-jest": {
      tsConfig: path_1.resolve(__dirname, "..", "..", "tsconfig.test.json"),
      diagnostics: false
    }
  }
};
//# sourceMappingURL=jest-config.js.map
