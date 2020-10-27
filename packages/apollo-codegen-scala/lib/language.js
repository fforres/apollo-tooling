"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function comment(generator, comment) {
  const split = comment ? comment.split("\n") : [];
  if (split.length > 0) {
    generator.printOnNewline("/**");
    split.forEach(line => {
      generator.printOnNewline(` * ${line.trim()}`);
    });
    generator.printOnNewline(" */");
  }
}
exports.comment = comment;
function packageDeclaration(generator, pkg) {
  generator.printNewlineIfNeeded();
  generator.printOnNewline(`package ${pkg}`);
}
exports.packageDeclaration = packageDeclaration;
function objectDeclaration(generator, { objectName, superclass }, closure) {
  generator.printNewlineIfNeeded();
  generator.printOnNewline(
    `object ${objectName}` + (superclass ? ` extends ${superclass}` : "")
  );
  generator.pushScope({ typeName: objectName });
  if (closure) {
    generator.withinBlock(closure);
  }
  generator.popScope();
}
exports.objectDeclaration = objectDeclaration;
function traitDeclaration(
  generator,
  { traitName, annotations, superclasses, description },
  closure
) {
  generator.printNewlineIfNeeded();
  if (description) {
    comment(generator, description);
  }
  generator.printOnNewline(
    `${(annotations || []).map(a => "@" + a).join(" ")} trait ${traitName}` +
      (superclasses ? ` extends ${superclasses.join(" with ")}` : "")
  );
  generator.pushScope({ typeName: traitName });
  if (closure) {
    generator.withinBlock(closure);
  }
  generator.popScope();
}
exports.traitDeclaration = traitDeclaration;
function methodDeclaration(
  generator,
  { methodName, description, params },
  closure
) {
  generator.printNewlineIfNeeded();
  if (description) {
    comment(generator, description);
  }
  const paramsSection = (params || [])
    .map(v => {
      return (
        v.name + ": " + v.type + (v.defaultValue ? ` = ${v.defaultValue}` : "")
      );
    })
    .join(", ");
  generator.printOnNewline(
    `def ${methodName}(${paramsSection})` + (closure ? " =" : "")
  );
  if (closure) {
    generator.withinBlock(closure);
  }
}
exports.methodDeclaration = methodDeclaration;
function propertyDeclaration(
  generator,
  { jsName, propertyName, typeName, description },
  closure
) {
  if (description) {
    comment(generator, description);
  }
  generator.printOnNewline(
    (jsName ? `@scala.scalajs.js.annotation.JSName("${jsName}") ` : "") +
      `val ${propertyName}: ${typeName}` +
      (closure ? ` =` : "")
  );
  if (closure) {
    generator.withinBlock(closure);
  }
}
exports.propertyDeclaration = propertyDeclaration;
function propertyDeclarations(generator, declarations) {
  declarations.forEach(o => {
    propertyDeclaration(generator, o);
  });
}
exports.propertyDeclarations = propertyDeclarations;
const reservedKeywords = new Set([
  "case",
  "catch",
  "class",
  "def",
  "do",
  "else",
  "extends",
  "false",
  "final",
  "for",
  "if",
  "match",
  "new",
  "null",
  "throw",
  "trait",
  "true",
  "try",
  "type",
  "until",
  "val",
  "var",
  "while",
  "with"
]);
function escapeIdentifierIfNeeded(identifier) {
  if (reservedKeywords.has(identifier)) {
    return "`" + identifier + "`";
  } else {
    return identifier;
  }
}
exports.escapeIdentifierIfNeeded = escapeIdentifierIfNeeded;
//# sourceMappingURL=language.js.map
