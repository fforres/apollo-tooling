"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const compiler_1 = require("./compiler");
function serializeToJSON(context, options) {
  return serializeAST(
    {
      operations: Object.values(context.operations),
      fragments: Object.values(context.fragments),
      typesUsed: context.typesUsed.map(type => serializeType(type, options)),
      unionTypes: context.unionTypes.map(type => serializeType(type, options)),
      interfaceTypes: serializeInterfaceTypes(context.interfaceTypes)
    },
    "\t"
  );
}
exports.default = serializeToJSON;
function serializeAST(ast, space) {
  return JSON.stringify(
    ast,
    function(_, value) {
      if (graphql_1.isType(value)) {
        return String(value);
      } else {
        return value;
      }
    },
    space
  );
}
exports.serializeAST = serializeAST;
function serializeType(type, options) {
  if (graphql_1.isEnumType(type)) {
    return serializeEnumType(type);
  } else if (graphql_1.isInputObjectType(type)) {
    return serializeInputObjectType(type, options);
  } else if (graphql_1.isScalarType(type)) {
    return serializeScalarType(type);
  } else if (graphql_1.isUnionType(type)) {
    return serializeUnionType(type);
  } else {
    throw new Error(`Unexpected GraphQL type: ${type}`);
  }
}
function serializeEnumType(type) {
  const { name, description } = type;
  const values = type.getValues();
  return {
    kind: "EnumType",
    name,
    description,
    values: values.map(value => ({
      name: value.name,
      description: value.description,
      isDeprecated: value.isDeprecated,
      deprecationReason: value.deprecationReason
    }))
  };
}
function serializeInputObjectType(type, options) {
  const { name, description } = type;
  const fields = Object.values(type.getFields());
  return {
    kind: "InputObjectType",
    name,
    description,
    fields: fields.map(field => ({
      name: field.name,
      type: String(field.type),
      typeNode:
        options && options.exposeTypeNodes
          ? compiler_1.stripProp(
              "loc",
              graphql_1.parseType(field.type.toString())
            )
          : undefined,
      description: field.description,
      defaultValue: field.defaultValue
    }))
  };
}
function serializeScalarType(type) {
  const { name, description } = type;
  return {
    kind: "ScalarType",
    name,
    description
  };
}
function serializeUnionType(type) {
  const { name } = type;
  return {
    name,
    types: type.getTypes()
  };
}
function serializeInterfaceTypes(interfaceTypes) {
  const types = [];
  for (let [interfaceType, implementors] of interfaceTypes) {
    types.push({
      name: interfaceType.toString(),
      types: implementors
    });
  }
  return types;
}
//# sourceMappingURL=serializeToJSON.js.map
