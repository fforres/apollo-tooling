"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const NodeEnvironment = require("jest-environment-node");
const vscode_1 = __importDefault(require("vscode"));
class VsCodeEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    this.global.vscode = vscode_1.default;
  }
  async teardown() {
    this.global.vscode = {};
    return await super.teardown();
  }
}
module.exports = VsCodeEnvironment;
//# sourceMappingURL=jest-vscode-environment.js.map
