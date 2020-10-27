"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_env_1 = require("apollo-env");
const transforms_1 = require("./transforms");
function defaultUsageReportingSignature(ast, operationName) {
  return transforms_1.printWithReducedWhitespace(
    transforms_1.sortAST(
      transforms_1.removeAliases(
        transforms_1.hideLiterals(
          transforms_1.dropUnusedDefinitions(ast, operationName)
        )
      )
    )
  );
}
exports.defaultUsageReportingSignature = defaultUsageReportingSignature;
function operationRegistrySignature(
  ast,
  operationName,
  options = {
    preserveStringAndNumericLiterals: false
  }
) {
  const withoutUnusedDefs = transforms_1.dropUnusedDefinitions(
    ast,
    operationName
  );
  const maybeWithLiterals = options.preserveStringAndNumericLiterals
    ? withoutUnusedDefs
    : transforms_1.hideStringAndNumericLiterals(withoutUnusedDefs);
  return transforms_1.printWithReducedWhitespace(
    transforms_1.sortAST(maybeWithLiterals)
  );
}
exports.operationRegistrySignature = operationRegistrySignature;
function defaultOperationRegistrySignature(ast, operationName) {
  return operationRegistrySignature(ast, operationName, {
    preserveStringAndNumericLiterals: false
  });
}
exports.defaultOperationRegistrySignature = defaultOperationRegistrySignature;
function operationHash(operation) {
  return apollo_env_1
    .createHash("sha256")
    .update(operation)
    .digest("hex");
}
exports.operationHash = operationHash;
//# sourceMappingURL=operationId.js.map
