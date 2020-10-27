"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function escapedString(string) {
  return string.replace(/"/g, '\\"');
}
exports.escapedString = escapedString;
function multilineString(generator, string) {
  const lines = string.split("\n");
  lines.forEach((line, index) => {
    const isLastLine = index != lines.length - 1;
    generator.printOnNewline(
      `"${escapedString(line)}"` + (isLastLine ? " +" : "")
    );
  });
}
exports.multilineString = multilineString;
//# sourceMappingURL=values.js.map
