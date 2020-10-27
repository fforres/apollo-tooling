"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const validate_1 = require("graphql/validation/validate");
const graphql_2 = require("../utilities/graphql");
const GraphQLSchemaValidationError_1 = require("./GraphQLSchemaValidationError");
const specifiedRules_1 = require("graphql/validation/specifiedRules");
const validation_1 = require("graphql/validation");
const apollo_env_1 = require("apollo-env");
const skippedSDLRules = [
  validation_1.KnownTypeNamesRule,
  validation_1.UniqueDirectivesPerLocationRule
];
try {
  const PossibleTypeExtensions = require("graphql/validation/rules/PossibleTypeExtensions")
    .PossibleTypeExtensions;
  if (PossibleTypeExtensions) {
    skippedSDLRules.push(PossibleTypeExtensions);
  }
} catch (e) {}
const sdlRules = specifiedRules_1.specifiedSDLRules.filter(
  rule => !skippedSDLRules.includes(rule)
);
function modulesFromSDL(modulesOrSDL) {
  if (Array.isArray(modulesOrSDL)) {
    return modulesOrSDL.map(moduleOrSDL => {
      if (
        graphql_2.isNode(moduleOrSDL) &&
        graphql_2.isDocumentNode(moduleOrSDL)
      ) {
        return { typeDefs: moduleOrSDL };
      } else {
        return moduleOrSDL;
      }
    });
  } else {
    return [{ typeDefs: modulesOrSDL }];
  }
}
exports.modulesFromSDL = modulesFromSDL;
function buildSchemaFromSDL(modulesOrSDL, schemaToExtend) {
  const modules = modulesFromSDL(modulesOrSDL);
  const documentAST = graphql_1.concatAST(
    modules.map(module => module.typeDefs)
  );
  const errors = validate_1.validateSDL(documentAST, schemaToExtend, sdlRules);
  if (errors.length > 0) {
    throw new GraphQLSchemaValidationError_1.GraphQLSchemaValidationError(
      errors
    );
  }
  const definitionsMap = Object.create(null);
  const extensionsMap = Object.create(null);
  const directiveDefinitions = [];
  const schemaDefinitions = [];
  const schemaExtensions = [];
  for (const definition of documentAST.definitions) {
    if (graphql_1.isTypeDefinitionNode(definition)) {
      const typeName = definition.name.value;
      if (definitionsMap[typeName]) {
        definitionsMap[typeName].push(definition);
      } else {
        definitionsMap[typeName] = [definition];
      }
    } else if (graphql_1.isTypeExtensionNode(definition)) {
      const typeName = definition.name.value;
      if (extensionsMap[typeName]) {
        extensionsMap[typeName].push(definition);
      } else {
        extensionsMap[typeName] = [definition];
      }
    } else if (definition.kind === graphql_1.Kind.DIRECTIVE_DEFINITION) {
      directiveDefinitions.push(definition);
    } else if (definition.kind === graphql_1.Kind.SCHEMA_DEFINITION) {
      schemaDefinitions.push(definition);
    } else if (definition.kind === graphql_1.Kind.SCHEMA_EXTENSION) {
      schemaExtensions.push(definition);
    }
  }
  let schema = schemaToExtend
    ? schemaToExtend
    : new graphql_1.GraphQLSchema({
        query: undefined
      });
  const missingTypeDefinitions = [];
  for (const [extendedTypeName, extensions] of Object.entries(extensionsMap)) {
    if (!definitionsMap[extendedTypeName]) {
      const extension = extensions[0];
      const kind = extension.kind;
      const definition = {
        kind: extKindToDefKind[kind],
        name: extension.name
      };
      missingTypeDefinitions.push(definition);
    }
  }
  schema = graphql_1.extendSchema(
    schema,
    {
      kind: graphql_1.Kind.DOCUMENT,
      definitions: [
        ...Object.values(definitionsMap).flat(),
        ...missingTypeDefinitions,
        ...directiveDefinitions
      ]
    },
    {
      assumeValidSDL: true
    }
  );
  schema = graphql_1.extendSchema(
    schema,
    {
      kind: graphql_1.Kind.DOCUMENT,
      definitions: Object.values(extensionsMap).flat()
    },
    {
      assumeValidSDL: true
    }
  );
  let operationTypeMap;
  if (schemaDefinitions.length > 0 || schemaExtensions.length > 0) {
    operationTypeMap = {};
    const operationTypes = [...schemaDefinitions, ...schemaExtensions]
      .map(node => node.operationTypes)
      .filter(apollo_env_1.isNotNullOrUndefined)
      .flat();
    for (const { operation, type } of operationTypes) {
      operationTypeMap[operation] = type.name.value;
    }
  } else {
    operationTypeMap = {
      query: "Query",
      mutation: "Mutation",
      subscription: "Subscription"
    };
  }
  schema = new graphql_1.GraphQLSchema(
    Object.assign(
      Object.assign({}, schema.toConfig()),
      apollo_env_1.mapValues(operationTypeMap, typeName =>
        typeName ? schema.getType(typeName) : undefined
      )
    )
  );
  for (const module of modules) {
    if (!module.resolvers) continue;
    addResolversToSchema(schema, module.resolvers);
  }
  return schema;
}
exports.buildSchemaFromSDL = buildSchemaFromSDL;
const extKindToDefKind = {
  [graphql_1.Kind.SCALAR_TYPE_EXTENSION]: graphql_1.Kind.SCALAR_TYPE_DEFINITION,
  [graphql_1.Kind.OBJECT_TYPE_EXTENSION]: graphql_1.Kind.OBJECT_TYPE_DEFINITION,
  [graphql_1.Kind.INTERFACE_TYPE_EXTENSION]:
    graphql_1.Kind.INTERFACE_TYPE_DEFINITION,
  [graphql_1.Kind.UNION_TYPE_EXTENSION]: graphql_1.Kind.UNION_TYPE_DEFINITION,
  [graphql_1.Kind.ENUM_TYPE_EXTENSION]: graphql_1.Kind.ENUM_TYPE_DEFINITION,
  [graphql_1.Kind.INPUT_OBJECT_TYPE_EXTENSION]:
    graphql_1.Kind.INPUT_OBJECT_TYPE_DEFINITION
};
function addResolversToSchema(schema, resolvers) {
  for (const [typeName, fieldConfigs] of Object.entries(resolvers)) {
    const type = schema.getType(typeName);
    if (graphql_1.isAbstractType(type)) {
      for (const [fieldName, fieldConfig] of Object.entries(fieldConfigs)) {
        if (fieldName.startsWith("__")) {
          type[fieldName.substring(2)] = fieldConfig;
        }
      }
    }
    if (graphql_1.isScalarType(type)) {
      for (const fn in fieldConfigs) {
        type[fn] = fieldConfigs[fn];
      }
    }
    if (graphql_1.isEnumType(type)) {
      const values = type.getValues();
      const newValues = {};
      values.forEach(value => {
        let newValue = fieldConfigs[value.name];
        if (newValue === undefined) {
          newValue = value.name;
        }
        newValues[value.name] = {
          value: newValue,
          deprecationReason: value.deprecationReason,
          description: value.description,
          astNode: value.astNode,
          extensions: undefined
        };
      });
      Object.assign(
        type,
        new graphql_1.GraphQLEnumType(
          Object.assign(Object.assign({}, type.toConfig()), {
            values: newValues
          })
        )
      );
    }
    if (!graphql_1.isObjectType(type)) continue;
    const fieldMap = type.getFields();
    for (const [fieldName, fieldConfig] of Object.entries(fieldConfigs)) {
      if (fieldName.startsWith("__")) {
        type[fieldName.substring(2)] = fieldConfig;
        continue;
      }
      const field = fieldMap[fieldName];
      if (!field) continue;
      if (typeof fieldConfig === "function") {
        field.resolve = fieldConfig;
      } else {
        field.resolve = fieldConfig.resolve;
      }
    }
  }
}
exports.addResolversToSchema = addResolversToSchema;
//# sourceMappingURL=buildSchemaFromSDL.js.map
