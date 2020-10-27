"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const graphql_1 = require("graphql");
const language_1 = require("./language");
const helpers_1 = require("./helpers");
const graphql_2 = require("apollo-codegen-core/lib/utilities/graphql");
const typeCase_1 = require("apollo-codegen-core/lib/compiler/visitors/typeCase");
const collectFragmentsReferenced_1 = require("apollo-codegen-core/lib/compiler/visitors/collectFragmentsReferenced");
const generateOperationId_1 = require("apollo-codegen-core/lib/compiler/visitors/generateOperationId");
const collectAndMergeFields_1 = require("apollo-codegen-core/lib/compiler/visitors/collectAndMergeFields");
require("apollo-codegen-core/lib/utilities/array");
const { join, wrap } = language_1.SwiftSource;
function generateSource(
  context,
  outputIndividualFiles,
  suppressMultilineStringLiterals,
  only
) {
  const generator = new SwiftAPIGenerator(context);
  if (outputIndividualFiles) {
    generator.withinFile(`Types.graphql.swift`, () => {
      generator.fileHeader();
      generator.namespaceDeclaration(context.options.namespace, () => {
        context.typesUsed.forEach(type => {
          generator.typeDeclarationForGraphQLType(type, true);
        });
      });
    });
    const inputFilePaths = new Set();
    Object.values(context.operations).forEach(operation => {
      inputFilePaths.add(operation.filePath);
    });
    Object.values(context.fragments).forEach(fragment => {
      inputFilePaths.add(fragment.filePath);
    });
    for (const inputFilePath of inputFilePaths) {
      if (only && inputFilePath !== only) continue;
      generator.withinFile(
        `${path_1.default.basename(inputFilePath)}.swift`,
        () => {
          generator.fileHeader();
          generator.namespaceExtensionDeclaration(
            context.options.namespace,
            () => {
              Object.values(context.operations).forEach(operation => {
                if (operation.filePath === inputFilePath) {
                  generator.classDeclarationForOperation(
                    operation,
                    true,
                    suppressMultilineStringLiterals
                  );
                }
              });
              Object.values(context.fragments).forEach(fragment => {
                if (fragment.filePath === inputFilePath) {
                  generator.structDeclarationForFragment(
                    fragment,
                    true,
                    suppressMultilineStringLiterals
                  );
                }
              });
            }
          );
        }
      );
    }
  } else {
    generator.fileHeader();
    generator.namespaceDeclaration(context.options.namespace, () => {
      context.typesUsed.forEach(type => {
        generator.typeDeclarationForGraphQLType(type, false);
      });
      Object.values(context.operations).forEach(operation => {
        generator.classDeclarationForOperation(
          operation,
          false,
          suppressMultilineStringLiterals
        );
      });
      Object.values(context.fragments).forEach(fragment => {
        generator.structDeclarationForFragment(
          fragment,
          false,
          suppressMultilineStringLiterals
        );
      });
    });
  }
  return generator;
}
exports.generateSource = generateSource;
class SwiftAPIGenerator extends language_1.SwiftGenerator {
  constructor(context) {
    super(context);
    this.helpers = new helpers_1.Helpers(context.options);
  }
  fileHeader() {
    this.printOnNewline(language_1.SwiftSource.raw`// @generated`);
    this.printOnNewline(
      language_1.SwiftSource
        .raw`//  This file was automatically generated and should not be edited.`
    );
    this.printNewline();
    this.printOnNewline(language_1.swift`import Apollo`);
    this.printOnNewline(language_1.swift`import Foundation`);
  }
  classDeclarationForOperation(
    operation,
    outputIndividualFiles,
    suppressMultilineStringLiterals
  ) {
    const {
      operationName,
      operationType,
      variables,
      source,
      selectionSet
    } = operation;
    let className;
    let protocol;
    switch (operationType) {
      case "query":
        className = `${this.helpers.operationClassName(operationName)}Query`;
        protocol = "GraphQLQuery";
        break;
      case "mutation":
        className = `${this.helpers.operationClassName(operationName)}Mutation`;
        protocol = "GraphQLMutation";
        break;
      case "subscription":
        className = `${this.helpers.operationClassName(
          operationName
        )}Subscription`;
        protocol = "GraphQLSubscription";
        break;
      default:
        throw new graphql_1.GraphQLError(
          `Unsupported operation type "${operationType}"`
        );
    }
    const {
      options: { namespace },
      fragments
    } = this.context;
    const isRedundant = !!namespace && outputIndividualFiles;
    const modifiers = isRedundant ? ["final"] : ["public", "final"];
    this.classDeclaration(
      {
        className,
        modifiers,
        adoptedProtocols: [protocol]
      },
      () => {
        if (source) {
          this.comment("The raw GraphQL definition of this operation.");
          this.printOnNewline(
            language_1.swift`public let operationDefinition: String =`
          );
          this.withIndent(() => {
            this.multilineString(source, suppressMultilineStringLiterals);
          });
        }
        this.printNewlineIfNeeded();
        this.printOnNewline(
          language_1.swift`public let operationName: String = ${language_1.SwiftSource.string(
            operationName
          )}`
        );
        const fragmentsReferenced = collectFragmentsReferenced_1.collectFragmentsReferenced(
          operation.selectionSet,
          fragments
        );
        if (this.context.options.generateOperationIds) {
          const {
            operationId,
            sourceWithFragments
          } = generateOperationId_1.generateOperationId(
            operation,
            fragments,
            fragmentsReferenced
          );
          operation.operationId = operationId;
          operation.sourceWithFragments = sourceWithFragments;
          this.printNewlineIfNeeded();
          this.printOnNewline(
            language_1.swift`public let operationIdentifier: String? = ${language_1.SwiftSource.string(
              operationId
            )}`
          );
        }
        if (fragmentsReferenced.size > 0) {
          this.printNewlineIfNeeded();
          this.printOnNewline(
            language_1.swift`public var queryDocument: String { return operationDefinition`
          );
          fragmentsReferenced.forEach(fragmentName => {
            this.print(
              language_1.swift`.appending("\\n" + ${this.helpers.structNameForFragmentName(
                fragmentName
              )}.fragmentDefinition)`
            );
          });
          this.print(language_1.swift` }`);
        }
        this.printNewlineIfNeeded();
        if (variables && variables.length > 0) {
          const properties = variables.map(({ name, type }) => {
            const typeName = this.helpers.typeNameFromGraphQLType(type);
            const isOptional = !(
              graphql_1.isNonNullType(type) ||
              (graphql_1.isListType(type) &&
                graphql_1.isNonNullType(type.ofType))
            );
            return { name, propertyName: name, type, typeName, isOptional };
          });
          this.propertyDeclarations(properties);
          this.printNewlineIfNeeded();
          this.initializerDeclarationForProperties(properties);
          this.printNewlineIfNeeded();
          this.printOnNewline(
            language_1.swift`public var variables: GraphQLMap?`
          );
          this.withinBlock(() => {
            this.printOnNewline(
              wrap(
                language_1.swift`return [`,
                join(
                  properties.map(
                    ({ name, propertyName }) =>
                      language_1.swift`${language_1.SwiftSource.string(
                        name
                      )}: ${propertyName}`
                  ),
                  ", "
                ) || language_1.swift`:`,
                language_1.swift`]`
              )
            );
          });
        } else {
          this.initializerDeclarationForProperties([]);
        }
        this.structDeclarationForSelectionSet(
          {
            structName: "Data",
            selectionSet
          },
          outputIndividualFiles
        );
      }
    );
  }
  structDeclarationForFragment(
    { fragmentName, selectionSet, source },
    outputIndividualFiles,
    suppressMultilineStringLiterals
  ) {
    const structName = this.helpers.structNameForFragmentName(fragmentName);
    this.structDeclarationForSelectionSet(
      {
        structName,
        adoptedProtocols: ["GraphQLFragment"],
        selectionSet
      },
      outputIndividualFiles,
      () => {
        if (source) {
          this.comment("The raw GraphQL definition of this fragment.");
          this.printOnNewline(
            language_1.swift`public static let fragmentDefinition: String =`
          );
          this.withIndent(() => {
            this.multilineString(source, suppressMultilineStringLiterals);
          });
        }
      }
    );
  }
  structDeclarationForSelectionSet(
    { structName, adoptedProtocols = ["GraphQLSelectionSet"], selectionSet },
    outputIndividualFiles,
    before
  ) {
    const typeCase = typeCase_1.typeCaseForSelectionSet(
      selectionSet,
      !!this.context.options.mergeInFieldsFromFragmentSpreads
    );
    this.structDeclarationForVariant(
      {
        structName,
        adoptedProtocols,
        variant: typeCase.default,
        typeCase
      },
      outputIndividualFiles,
      before,
      () => {
        const variants = typeCase.variants.map(
          this.helpers.propertyFromVariant,
          this.helpers
        );
        for (const variant of variants) {
          this.propertyDeclarationForVariant(variant);
          this.structDeclarationForVariant(
            {
              structName: variant.structName,
              variant
            },
            outputIndividualFiles
          );
        }
      }
    );
  }
  structDeclarationForVariant(
    {
      structName,
      adoptedProtocols = ["GraphQLSelectionSet"],
      variant,
      typeCase
    },
    outputIndividualFiles,
    before,
    after
  ) {
    const {
      options: {
        namespace,
        mergeInFieldsFromFragmentSpreads,
        omitDeprecatedEnumCases
      }
    } = this.context;
    this.structDeclaration(
      { structName, adoptedProtocols, namespace },
      outputIndividualFiles,
      () => {
        if (before) {
          before();
        }
        this.printNewlineIfNeeded();
        this.printOnNewline(
          language_1.swift`public static let possibleTypes: [String] = [`
        );
        this.print(
          join(
            variant.possibleTypes.map(
              type =>
                language_1.swift`${language_1.SwiftSource.string(type.name)}`
            ),
            ", "
          )
        );
        this.print(language_1.swift`]`);
        this.printNewlineIfNeeded();
        this.printOnNewline(
          language_1.swift`public static var selections: [GraphQLSelection] {`
        );
        this.withIndent(() => {
          this.printOnNewline(language_1.swift`return `);
          if (typeCase) {
            this.typeCaseInitialization(typeCase);
          } else {
            this.selectionSetInitialization(variant);
          }
        });
        this.printOnNewline(language_1.swift`}`);
        this.printNewlineIfNeeded();
        this.printOnNewline(
          language_1.swift`public private(set) var resultMap: ResultMap`
        );
        this.printNewlineIfNeeded();
        this.printOnNewline(
          language_1.swift`public init(unsafeResultMap: ResultMap)`
        );
        this.withinBlock(() => {
          this.printOnNewline(
            language_1.swift`self.resultMap = unsafeResultMap`
          );
        });
        if (typeCase) {
          this.initializersForTypeCase(typeCase);
        } else {
          this.initializersForVariant(variant);
        }
        const fields = collectAndMergeFields_1
          .collectAndMergeFields(variant, !!mergeInFieldsFromFragmentSpreads)
          .map(field => this.helpers.propertyFromField(field));
        const fragmentSpreads = variant.fragmentSpreads.map(fragmentSpread => {
          const isConditional = variant.possibleTypes.some(
            type => !fragmentSpread.selectionSet.possibleTypes.includes(type)
          );
          return this.helpers.propertyFromFragmentSpread(
            fragmentSpread,
            isConditional
          );
        });
        fields.forEach(this.propertyDeclarationForField, this);
        if (fragmentSpreads.length > 0) {
          this.printNewlineIfNeeded();
          this.printOnNewline(
            language_1.swift`public var fragments: Fragments`
          );
          this.withinBlock(() => {
            this.printOnNewline(language_1.swift`get`);
            this.withinBlock(() => {
              this.printOnNewline(
                language_1.swift`return Fragments(unsafeResultMap: resultMap)`
              );
            });
            this.printOnNewline(language_1.swift`set`);
            this.withinBlock(() => {
              this.printOnNewline(
                language_1.swift`resultMap += newValue.resultMap`
              );
            });
          });
          this.structDeclaration(
            {
              structName: "Fragments"
            },
            outputIndividualFiles,
            () => {
              this.printOnNewline(
                language_1.swift`public private(set) var resultMap: ResultMap`
              );
              this.printNewlineIfNeeded();
              this.printOnNewline(
                language_1.swift`public init(unsafeResultMap: ResultMap)`
              );
              this.withinBlock(() => {
                this.printOnNewline(
                  language_1.swift`self.resultMap = unsafeResultMap`
                );
              });
              for (const fragmentSpread of fragmentSpreads) {
                const {
                  propertyName,
                  typeName,
                  structName,
                  isConditional
                } = fragmentSpread;
                this.printNewlineIfNeeded();
                this.printOnNewline(
                  language_1.swift`public var ${propertyName}: ${typeName}`
                );
                this.withinBlock(() => {
                  this.printOnNewline(language_1.swift`get`);
                  this.withinBlock(() => {
                    if (isConditional) {
                      this.printOnNewline(
                        language_1.swift`if !${structName}.possibleTypes.contains(resultMap["__typename"]! as! String) { return nil }`
                      );
                    }
                    this.printOnNewline(
                      language_1.swift`return ${structName}(unsafeResultMap: resultMap)`
                    );
                  });
                  this.printOnNewline(language_1.swift`set`);
                  this.withinBlock(() => {
                    if (isConditional) {
                      this.printOnNewline(
                        language_1.swift`guard let newValue = newValue else { return }`
                      );
                      this.printOnNewline(
                        language_1.swift`resultMap += newValue.resultMap`
                      );
                    } else {
                      this.printOnNewline(
                        language_1.swift`resultMap += newValue.resultMap`
                      );
                    }
                  });
                });
              }
            }
          );
        }
        for (const field of fields) {
          if (
            graphql_1.isCompositeType(graphql_1.getNamedType(field.type)) &&
            field.selectionSet
          ) {
            this.structDeclarationForSelectionSet(
              {
                structName: field.structName,
                selectionSet: field.selectionSet
              },
              outputIndividualFiles
            );
          }
        }
        if (after) {
          after();
        }
      }
    );
  }
  initializersForTypeCase(typeCase) {
    const variants = typeCase.variants;
    if (variants.length == 0) {
      this.initializersForVariant(typeCase.default);
    } else {
      const remainder = typeCase.remainder;
      for (const variant of remainder ? [remainder, ...variants] : variants) {
        this.initializersForVariant(
          variant,
          variant === remainder
            ? undefined
            : this.helpers.structNameForVariant(variant),
          false
        );
      }
    }
  }
  initializersForVariant(variant, namespace, useInitializerIfPossible = true) {
    if (useInitializerIfPossible && variant.possibleTypes.length == 1) {
      const properties = this.helpers.propertiesForSelectionSet(variant);
      if (!properties) return;
      this.printNewlineIfNeeded();
      this.printOnNewline(language_1.swift`public init`);
      this.parametersForProperties(properties);
      this.withinBlock(() => {
        this.printOnNewline(
          wrap(
            language_1.swift`self.init(unsafeResultMap: [`,
            join(
              [
                language_1.swift`"__typename": ${language_1.SwiftSource.string(
                  variant.possibleTypes[0].toString()
                )}`,
                ...properties.map(p =>
                  this.propertyAssignmentForField(p, properties)
                )
              ],
              ", "
            ) || language_1.swift`:`,
            language_1.swift`])`
          )
        );
      });
    } else {
      const structName = this.scope.typeName;
      for (const possibleType of variant.possibleTypes) {
        const properties = this.helpers.propertiesForSelectionSet(
          {
            possibleTypes: [possibleType],
            selections: variant.selections
          },
          namespace
        );
        if (!properties) continue;
        this.printNewlineIfNeeded();
        this.printOnNewline(
          language_1.SwiftSource.raw`public static func make${possibleType}`
        );
        this.parametersForProperties(properties);
        this.print(language_1.swift` -> ${structName}`);
        this.withinBlock(() => {
          this.printOnNewline(
            wrap(
              language_1.swift`return ${structName}(unsafeResultMap: [`,
              join(
                [
                  language_1.swift`"__typename": ${language_1.SwiftSource.string(
                    possibleType.toString()
                  )}`,
                  ...properties.map(p =>
                    this.propertyAssignmentForField(p, properties)
                  )
                ],
                ", "
              ) || language_1.swift`:`,
              language_1.swift`])`
            )
          );
        });
      }
    }
  }
  propertyAssignmentForField(field, properties) {
    const {
      responseKey,
      propertyName,
      type,
      isConditional,
      structName
    } = field;
    const parameterName = this.helpers.internalParameterName(
      propertyName,
      properties
    );
    const valueExpression = graphql_1.isCompositeType(
      graphql_1.getNamedType(type)
    )
      ? this.helpers.mapExpressionForType(
          type,
          isConditional,
          expression => language_1.swift`${expression}.resultMap`,
          language_1.SwiftSource.identifier(parameterName),
          structName,
          "ResultMap"
        )
      : language_1.SwiftSource.identifier(parameterName);
    return language_1.swift`${language_1.SwiftSource.string(
      responseKey
    )}: ${valueExpression}`;
  }
  propertyDeclarationForField(field) {
    const {
      responseKey,
      propertyName,
      typeName,
      type,
      isOptional,
      isConditional
    } = field;
    const unmodifiedFieldType = graphql_1.getNamedType(type);
    this.printNewlineIfNeeded();
    this.comment(field.description);
    this.deprecationAttributes(field.isDeprecated, field.deprecationReason);
    this.printOnNewline(
      language_1.swift`public var ${propertyName}: ${typeName}`
    );
    this.withinBlock(() => {
      if (graphql_1.isCompositeType(unmodifiedFieldType)) {
        const structName = this.helpers.structNameForPropertyName(propertyName);
        if (graphql_2.isList(type)) {
          this.printOnNewline(language_1.swift`get`);
          this.withinBlock(() => {
            const resultMapTypeName = this.helpers.typeNameFromGraphQLType(
              type,
              "ResultMap",
              false
            );
            let expression;
            if (isOptional) {
              expression = language_1.swift`(resultMap[${language_1.SwiftSource.string(
                responseKey
              )}] as? ${resultMapTypeName})`;
            } else {
              expression = language_1.swift`(resultMap[${language_1.SwiftSource.string(
                responseKey
              )}] as! ${resultMapTypeName})`;
            }
            this.printOnNewline(
              language_1.swift`return ${this.helpers.mapExpressionForType(
                type,
                isConditional,
                expression =>
                  language_1.swift`${structName}(unsafeResultMap: ${expression})`,
                expression,
                "ResultMap",
                structName
              )}`
            );
          });
          this.printOnNewline(language_1.swift`set`);
          this.withinBlock(() => {
            let newValueExpression = this.helpers.mapExpressionForType(
              type,
              isConditional,
              expression => language_1.swift`${expression}.resultMap`,
              language_1.swift`newValue`,
              structName,
              "ResultMap"
            );
            this.printOnNewline(
              language_1.swift`resultMap.updateValue(${newValueExpression}, forKey: ${language_1.SwiftSource.string(
                responseKey
              )})`
            );
          });
        } else {
          this.printOnNewline(language_1.swift`get`);
          this.withinBlock(() => {
            if (isOptional) {
              this.printOnNewline(
                language_1.swift`return (resultMap[${language_1.SwiftSource.string(
                  responseKey
                )}] as? ResultMap).flatMap { ${structName}(unsafeResultMap: $0) }`
              );
            } else {
              this.printOnNewline(
                language_1.swift`return ${structName}(unsafeResultMap: resultMap[${language_1.SwiftSource.string(
                  responseKey
                )}]! as! ResultMap)`
              );
            }
          });
          this.printOnNewline(language_1.swift`set`);
          this.withinBlock(() => {
            let newValueExpression;
            if (isOptional) {
              newValueExpression = "newValue?.resultMap";
            } else {
              newValueExpression = "newValue.resultMap";
            }
            this.printOnNewline(
              language_1.swift`resultMap.updateValue(${newValueExpression}, forKey: ${language_1.SwiftSource.string(
                responseKey
              )})`
            );
          });
        }
      } else {
        this.printOnNewline(language_1.swift`get`);
        this.withinBlock(() => {
          if (isOptional) {
            this.printOnNewline(
              language_1.swift`return resultMap[${language_1.SwiftSource.string(
                responseKey
              )}] as? ${typeName.slice(0, -1)}`
            );
          } else {
            this.printOnNewline(
              language_1.swift`return resultMap[${language_1.SwiftSource.string(
                responseKey
              )}]! as! ${typeName}`
            );
          }
        });
        this.printOnNewline(language_1.swift`set`);
        this.withinBlock(() => {
          this.printOnNewline(
            language_1.swift`resultMap.updateValue(newValue, forKey: ${language_1.SwiftSource.string(
              responseKey
            )})`
          );
        });
      }
    });
  }
  propertyDeclarationForVariant(variant) {
    const { propertyName, typeName, structName } = variant;
    this.printNewlineIfNeeded();
    this.printOnNewline(
      language_1.swift`public var ${propertyName}: ${typeName}`
    );
    this.withinBlock(() => {
      this.printOnNewline(language_1.swift`get`);
      this.withinBlock(() => {
        this.printOnNewline(
          language_1.swift`if !${structName}.possibleTypes.contains(__typename) { return nil }`
        );
        this.printOnNewline(
          language_1.swift`return ${structName}(unsafeResultMap: resultMap)`
        );
      });
      this.printOnNewline(language_1.swift`set`);
      this.withinBlock(() => {
        this.printOnNewline(
          language_1.swift`guard let newValue = newValue else { return }`
        );
        this.printOnNewline(language_1.swift`resultMap = newValue.resultMap`);
      });
    });
  }
  initializerDeclarationForProperties(properties) {
    this.printOnNewline(language_1.swift`public init`);
    this.parametersForProperties(properties);
    this.withinBlock(() => {
      properties.forEach(({ propertyName }) => {
        this.printOnNewline(
          language_1.swift`self.${propertyName} = ${this.helpers.internalParameterName(
            propertyName,
            properties
          )}`
        );
      });
    });
  }
  parametersForProperties(properties) {
    this.print(language_1.swift`(`);
    this.print(
      join(
        properties.map(({ propertyName, typeName, isOptional }) => {
          const internalName = this.helpers.internalParameterName(
            propertyName,
            properties
          );
          const decl =
            internalName === propertyName
              ? propertyName
              : language_1.swift`${propertyName} ${internalName}`;
          return join([
            language_1.swift`${decl}: ${typeName}`,
            isOptional ? language_1.swift` = nil` : undefined
          ]);
        }),
        ", "
      )
    );
    this.print(language_1.swift`)`);
  }
  typeCaseInitialization(typeCase) {
    if (typeCase.variants.length < 1) {
      this.selectionSetInitialization(typeCase.default);
      return;
    }
    this.print(language_1.swift`[`);
    this.withIndent(() => {
      this.printOnNewline(language_1.swift`GraphQLTypeCase(`);
      this.withIndent(() => {
        this.printOnNewline(language_1.swift`variants: [`);
        this.print(
          join(
            typeCase.variants.flatMap(variant => {
              const structName = this.helpers.structNameForVariant(variant);
              return variant.possibleTypes.map(
                type =>
                  language_1.swift`${language_1.SwiftSource.string(
                    type.toString()
                  )}: ${structName}.selections`
              );
            }),
            ", "
          )
        );
        this.print(language_1.swift`],`);
        this.printOnNewline(language_1.swift`default: `);
        this.selectionSetInitialization(typeCase.default);
      });
      this.printOnNewline(language_1.swift`)`);
    });
    this.printOnNewline(language_1.swift`]`);
  }
  selectionSetInitialization(selectionSet) {
    this.print(language_1.swift`[`);
    this.withIndent(() => {
      for (const selection of selectionSet.selections) {
        switch (selection.kind) {
          case "Field": {
            const { name, alias, args, type } = selection;
            const responseKey = selection.alias || selection.name;
            const structName = this.helpers.structNameForPropertyName(
              responseKey
            );
            this.printOnNewline(language_1.swift`GraphQLField(`);
            this.print(
              join(
                [
                  language_1.swift`${language_1.SwiftSource.string(name)}`,
                  alias
                    ? language_1.swift`alias: ${language_1.SwiftSource.string(
                        alias
                      )}`
                    : undefined,
                  args && args.length
                    ? language_1.swift`arguments: ${this.helpers.dictionaryLiteralForFieldArguments(
                        args
                      )}`
                    : undefined,
                  language_1.swift`type: ${this.helpers.fieldTypeEnum(
                    type,
                    structName
                  )}`
                ],
                ", "
              )
            );
            this.print(language_1.swift`),`);
            break;
          }
          case "BooleanCondition":
            this.printOnNewline(language_1.swift`GraphQLBooleanCondition(`);
            this.print(
              join(
                [
                  language_1.swift`variableName: ${language_1.SwiftSource.string(
                    selection.variableName
                  )}`,
                  language_1.swift`inverted: ${selection.inverted}`,
                  language_1.swift`selections: `
                ],
                ", "
              )
            );
            this.selectionSetInitialization(selection.selectionSet);
            this.print(language_1.swift`),`);
            break;
          case "TypeCondition": {
            this.printOnNewline(language_1.swift`GraphQLTypeCondition(`);
            this.print(
              join(
                [
                  language_1.swift`possibleTypes: [${join(
                    selection.selectionSet.possibleTypes.map(
                      type =>
                        language_1.swift`${language_1.SwiftSource.string(
                          type.name
                        )}`
                    ),
                    ", "
                  )}]`,
                  language_1.swift`selections: `
                ],
                ", "
              )
            );
            this.selectionSetInitialization(selection.selectionSet);
            this.print(language_1.swift`),`);
            break;
          }
          case "FragmentSpread": {
            const structName = this.helpers.structNameForFragmentName(
              selection.fragmentName
            );
            this.printOnNewline(
              language_1.swift`GraphQLFragmentSpread(${structName}.self),`
            );
            break;
          }
        }
      }
    });
    this.printOnNewline(language_1.swift`]`);
  }
  typeDeclarationForGraphQLType(type, outputIndividualFiles) {
    if (graphql_1.isEnumType(type)) {
      this.enumerationDeclaration(type);
    } else if (graphql_1.isInputObjectType(type)) {
      this.structDeclarationForInputObjectType(type, outputIndividualFiles);
    }
  }
  enumerationDeclaration(type) {
    const { name, description } = type;
    const values = type.getValues().filter(value => {
      return (
        !value.isDeprecated || !this.context.options.omitDeprecatedEnumCases
      );
    });
    this.printNewlineIfNeeded();
    this.comment(description || undefined);
    this.printOnNewline(
      language_1.swift`public enum ${name}: RawRepresentable, Equatable, Hashable, CaseIterable, Apollo.JSONDecodable, Apollo.JSONEncodable`
    );
    this.withinBlock(() => {
      this.printOnNewline(language_1.swift`public typealias RawValue = String`);
      values.forEach(value => {
        this.comment(value.description || undefined);
        this.deprecationAttributes(
          value.isDeprecated,
          value.deprecationReason || undefined
        );
        this.printOnNewline(
          language_1.swift`case ${this.helpers.enumCaseName(value.name)}`
        );
      });
      this.comment("Auto generated constant for unknown enum values");
      this.printOnNewline(language_1.swift`case __unknown(RawValue)`);
      this.printNewlineIfNeeded();
      this.printOnNewline(language_1.swift`public init?(rawValue: RawValue)`);
      this.withinBlock(() => {
        this.printOnNewline(language_1.swift`switch rawValue`);
        this.withinBlock(() => {
          values.forEach(value => {
            this.printOnNewline(
              language_1.swift`case ${language_1.SwiftSource.string(
                value.value
              )}: self = ${this.helpers.enumDotCaseName(value.name)}`
            );
          });
          this.printOnNewline(
            language_1.swift`default: self = .__unknown(rawValue)`
          );
        });
      });
      this.printNewlineIfNeeded();
      this.printOnNewline(language_1.swift`public var rawValue: RawValue`);
      this.withinBlock(() => {
        this.printOnNewline(language_1.swift`switch self`);
        this.withinBlock(() => {
          values.forEach(value => {
            this.printOnNewline(
              language_1.swift`case ${this.helpers.enumDotCaseName(
                value.name
              )}: return ${language_1.SwiftSource.string(value.value)}`
            );
          });
          this.printOnNewline(
            language_1.swift`case .__unknown(let value): return value`
          );
        });
      });
      this.printNewlineIfNeeded();
      this.printOnNewline(
        language_1.swift`public static func == (lhs: ${name}, rhs: ${name}) -> Bool`
      );
      this.withinBlock(() => {
        this.printOnNewline(language_1.swift`switch (lhs, rhs)`);
        this.withinBlock(() => {
          values.forEach(value => {
            const enumDotCaseName = this.helpers.enumDotCaseName(value.name);
            const tuple = language_1.swift`(${enumDotCaseName}, ${enumDotCaseName})`;
            this.printOnNewline(language_1.swift`case ${tuple}: return true`);
          });
          this.printOnNewline(
            language_1.swift`case (.__unknown(let lhsValue), .__unknown(let rhsValue)): return lhsValue == rhsValue`
          );
          this.printOnNewline(language_1.swift`default: return false`);
        });
      });
      this.printNewlineIfNeeded();
      this.printOnNewline(
        language_1.swift`public static var allCases: [${name}]`
      );
      this.withinBlock(() => {
        this.printOnNewline(language_1.swift`return [`);
        values.forEach(value => {
          const enumDotCaseName = this.helpers.enumDotCaseName(value.name);
          this.withIndent(() => {
            this.printOnNewline(language_1.swift`${enumDotCaseName},`);
          });
        });
        this.printOnNewline(language_1.swift`]`);
      });
    });
  }
  structDeclarationForInputObjectType(type, outputIndividualFiles) {
    const { name: structName, description } = type;
    const adoptedProtocols = ["GraphQLMapConvertible"];
    const fields = Object.values(type.getFields());
    const properties = fields.map(
      this.helpers.propertyFromInputField,
      this.helpers
    );
    properties.forEach(property => {
      if (property.isOptional) {
        property.typeName = `Swift.Optional<${property.typeName}>`;
      }
    });
    this.structDeclaration(
      { structName, description: description || undefined, adoptedProtocols },
      outputIndividualFiles,
      () => {
        this.printOnNewline(
          language_1.swift`public var graphQLMap: GraphQLMap`
        );
        this.printNewlineIfNeeded();
        if (properties.length > 0) {
          this.comment("- Parameters:");
          properties.forEach(property => {
            var propertyDescription = "";
            if (property.description) {
              propertyDescription = `: ${property.description}`;
            }
            this.comment(
              `  - ${property.propertyName}${propertyDescription}`,
              false
            );
          });
        }
        this.printOnNewline(language_1.swift`public init`);
        this.print(language_1.swift`(`);
        this.print(
          join(
            properties.map(({ propertyName, typeName, isOptional }) => {
              const internalName = this.helpers.internalParameterName(
                propertyName,
                properties
              );
              const decl =
                internalName === propertyName
                  ? propertyName
                  : language_1.swift`${propertyName} ${internalName}`;
              return join([
                language_1.swift`${decl}: ${typeName}`,
                isOptional ? language_1.swift` = nil` : undefined
              ]);
            }),
            ", "
          )
        );
        this.print(language_1.swift`)`);
        this.withinBlock(() => {
          this.printOnNewline(
            wrap(
              language_1.swift`graphQLMap = [`,
              join(
                properties.map(
                  ({ name, propertyName }) =>
                    language_1.swift`${language_1.SwiftSource.string(
                      name
                    )}: ${this.helpers.internalParameterName(
                      propertyName,
                      properties
                    )}`
                ),
                ", "
              ) || language_1.swift`:`,
              language_1.swift`]`
            )
          );
        });
        for (const {
          name,
          propertyName,
          typeName,
          description,
          isOptional
        } of properties) {
          this.printNewlineIfNeeded();
          this.comment(description || undefined);
          this.printOnNewline(
            language_1.swift`public var ${propertyName}: ${typeName}`
          );
          this.withinBlock(() => {
            this.printOnNewline(language_1.swift`get`);
            this.withinBlock(() => {
              if (isOptional) {
                this.printOnNewline(
                  language_1.swift`return graphQLMap[${language_1.SwiftSource.string(
                    name
                  )}] as? ${typeName} ?? ${typeName}.none`
                );
              } else {
                this.printOnNewline(
                  language_1.swift`return graphQLMap[${language_1.SwiftSource.string(
                    name
                  )}] as! ${typeName}`
                );
              }
            });
            this.printOnNewline(language_1.swift`set`);
            this.withinBlock(() => {
              this.printOnNewline(
                language_1.swift`graphQLMap.updateValue(newValue, forKey: ${language_1.SwiftSource.string(
                  name
                )})`
              );
            });
          });
        }
      }
    );
  }
}
exports.SwiftAPIGenerator = SwiftAPIGenerator;
//# sourceMappingURL=codeGeneration.js.map
