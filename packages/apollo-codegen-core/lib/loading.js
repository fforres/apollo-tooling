"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("apollo-env");
const localfs_1 = require("./localfs");
const common_tags_1 = require("common-tags");
const astTypes = require("ast-types");
const recast = require("recast");
const graphql_1 = require("graphql");
const apollo_language_server_1 = require("apollo-language-server");
function loadSchema(schemaPath) {
  if (!localfs_1.fs.existsSync(schemaPath)) {
    throw new apollo_language_server_1.ToolError(
      `Cannot find GraphQL schema file: ${schemaPath}`
    );
  }
  const schemaData = require(schemaPath);
  if (!schemaData.data && !schemaData.__schema) {
    throw new apollo_language_server_1.ToolError(
      "GraphQL schema file should contain a valid GraphQL introspection query result"
    );
  }
  return graphql_1.buildClientSchema(
    schemaData.data ? schemaData.data : schemaData
  );
}
exports.loadSchema = loadSchema;
function maybeCommentedOut(content) {
  return (
    (content.indexOf("/*") > -1 && content.indexOf("*/") > -1) ||
    content.split("//").length > 1
  );
}
function filterValidDocuments(documents) {
  return documents.filter(document => {
    const source = new graphql_1.Source(document);
    try {
      graphql_1.parse(source);
      return true;
    } catch (e) {
      if (!maybeCommentedOut(document)) {
        console.warn(common_tags_1.stripIndents`
            Failed to parse:

            ${document.trim().split("\n")[0]}...
          `);
      }
      return false;
    }
  });
}
function extractDocumentsWithAST(content, options) {
  let tagName = options.tagName || "gql";
  const ast = recast.parse(content, {
    parser: options.parser || require("recast/parsers/babylon")
  });
  const finished = [];
  astTypes.visit(ast, {
    visitTaggedTemplateExpression(path) {
      const tag = path.value.tag;
      if (tag.name === tagName) {
        finished.push(
          path.value.quasi.quasis.map(({ value }) => value.cooked).join("")
        );
      }
      return this.traverse(path);
    }
  });
  return finished;
}
function extractDocumentFromJavascript(content, options = {}) {
  let matches = [];
  try {
    matches = extractDocumentsWithAST(content, options);
  } catch (e) {
    e.message =
      "Operation extraction " +
      (options.inputPath ? "from file " + options.inputPath + " " : "") +
      "failed with \n" +
      e.message;
    throw e;
  }
  matches = filterValidDocuments(matches);
  const doc = matches.join("\n");
  return doc.length ? doc : null;
}
exports.extractDocumentFromJavascript = extractDocumentFromJavascript;
function loadQueryDocuments(inputPaths, tagName = "gql") {
  const sources = inputPaths
    .map(inputPath => {
      if (localfs_1.fs.lstatSync(inputPath).isDirectory()) {
        return null;
      }
      const body = localfs_1.fs.readFileSync(inputPath, "utf8");
      if (!body) {
        return null;
      }
      if (
        inputPath.endsWith(".jsx") ||
        inputPath.endsWith(".js") ||
        inputPath.endsWith(".tsx") ||
        inputPath.endsWith(".ts")
      ) {
        let parser;
        if (inputPath.endsWith(".ts")) {
          parser = require("recast/parsers/typescript");
        } else if (inputPath.endsWith(".tsx")) {
          parser = {
            parse: (source, options) => {
              const babelParser = require("@babel/parser");
              options = require("recast/parsers/_babylon_options.js")(options);
              options.plugins.push("jsx", "typescript");
              return babelParser.parse(source, options);
            }
          };
        } else {
          parser = require("recast/parsers/babylon");
        }
        const doc = extractDocumentFromJavascript(body.toString(), {
          tagName,
          parser,
          inputPath
        });
        return doc ? new graphql_1.Source(doc, inputPath) : null;
      }
      if (
        inputPath.endsWith(".graphql") ||
        inputPath.endsWith(".graphqls") ||
        inputPath.endsWith(".gql")
      ) {
        return new graphql_1.Source(body, inputPath);
      }
      return null;
    })
    .filter(source => source)
    .map(source => {
      try {
        return graphql_1.parse(source);
      } catch (e) {
        const name = (source && source.name) || "";
        console.warn(common_tags_1.stripIndents`
        Warning: error parsing GraphQL file ${name}
        ${e.stack}`);
        return null;
      }
    })
    .filter(source => source);
  return sources;
}
exports.loadQueryDocuments = loadQueryDocuments;
function loadAndMergeQueryDocuments(inputPaths, tagName = "gql") {
  return graphql_1.concatAST(loadQueryDocuments(inputPaths, tagName));
}
exports.loadAndMergeQueryDocuments = loadAndMergeQueryDocuments;
function extractOperationsAndFragments(documents, errorLogger) {
  const fragments = {};
  const operations = [];
  documents.forEach(operation => {
    graphql_1.visit(operation, {
      [graphql_1.Kind.FRAGMENT_DEFINITION]: node => {
        if (!node.name || node.name.kind !== "Name") {
          (errorLogger || console.warn)(
            `Fragment Definition must have a name ${node}`
          );
        }
        if (fragments[node.name.value]) {
          (errorLogger || console.warn)(
            `Duplicate definition of fragment ${node.name.value}. Please rename one of them or use the same fragment`
          );
        }
        fragments[node.name.value] = node;
      },
      [graphql_1.Kind.OPERATION_DEFINITION]: node => {
        operations.push(node);
      }
    });
  });
  return { fragments, operations };
}
exports.extractOperationsAndFragments = extractOperationsAndFragments;
function combineOperationsAndFragments(operations, fragments, errorLogger) {
  const fullOperations = [];
  operations.forEach(operation => {
    const completeOperation = [
      operation,
      ...Object.values(getNestedFragments(operation, fragments, errorLogger))
    ];
    fullOperations.push({
      kind: "Document",
      definitions: completeOperation
    });
  });
  return fullOperations;
}
exports.combineOperationsAndFragments = combineOperationsAndFragments;
function getNestedFragments(operation, fragments, errorLogger) {
  const combination = {};
  graphql_1.visit(operation, {
    [graphql_1.Kind.FRAGMENT_SPREAD]: node => {
      if (!node.name || node.name.kind !== "Name") {
        (errorLogger || console.warn)(
          `Fragment Spread must have a name ${node}`
        );
      }
      if (!fragments[node.name.value]) {
        (errorLogger || console.warn)(
          `Fragment ${node.name.value} is not defined. Please add the file containing the fragment to the set of included paths`
        );
      }
      Object.assign(
        combination,
        getNestedFragments(fragments[node.name.value], fragments, errorLogger),
        { [node.name.value]: fragments[node.name.value] }
      );
    }
  });
  return combination;
}
//# sourceMappingURL=loading.js.map
