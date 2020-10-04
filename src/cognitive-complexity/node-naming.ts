import * as ts from "typescript";
import { UnreachableNodeState } from "../util/node-util";
import {
    getIdentifier,
    FunctionNode,
    isFunctionNode,
    getTextWithoutBrackets
} from "./node-inspection";

export function chooseContainerName(node: ts.Node, variableBeingDefined: string | undefined): string | undefined {
    if (isFunctionNode(node)) {
        return getFunctionNodeName(node, variableBeingDefined);
    }

    if (ts.isClassDeclaration(node)) {
        return getClassDeclarationName(node);
    }

    if (ts.isClassExpression(node)) {
        return getClassExpressionName(node, variableBeingDefined);
    }

    const name = findIntroducedLocalName(node);
    if (name !== undefined) {
        return name;
    }

    if (ts.isModuleDeclaration(node)) {
        return getModuleDeclarationName(node);
    }

    if (ts.isTypeAliasDeclaration(node)) {
        return getTypeAliasName(node);
    }

    return undefined;
}

export function findIntroducedLocalName(node: ts.Node): string | undefined {
    if (ts.isClassDeclaration(node)) {
        return getClassDeclarationName(node);
    }

    if (ts.isClassExpression(node)) {
        return getClassExpressionName(node);
    }

    if (ts.isConstructorDeclaration(node)) {
        return "constructor";
    }

    if (ts.isInterfaceDeclaration(node)) {
        return getInterfaceDeclarationName(node);
    }

    if (isFunctionNode(node)) {
        return getFunctionNodeName(node);
    }

    return undefined;
}

export function getNameIfCalledNode(node: ts.Node): string | undefined {
    if (ts.isCallExpression(node)) {
        return getCalledFunctionName(node);
    }

    if (ts.isNewExpression(node)) {
        return getNewedConstructorName(node);
    }

    if (ts.isPropertyAccessExpression(node)) {
        return node.getText();
    }

    if (ts.isJsxOpeningLikeElement(node)) {
        return node.getChildAt(1).getText();
    }

    if (ts.isTypeReferenceNode(node)) {
        return node.getChildAt(0).getText();
    }

    if (ts.isTaggedTemplateExpression(node)) {
        return node.getChildAt(0).getText();
    }

    return undefined;
}

export function getNameIfNameDeclaration(node: ts.Node): string | undefined {
    if (ts.isVariableDeclaration(node)
        || ts.isCallSignatureDeclaration(node)
        || ts.isBindingElement(node)
        || ts.isTypeElement(node)
        || ts.isEnumDeclaration(node)
        || ts.isEnumMember(node)
    ) {
        const identifier = node.getChildAt(0).getText();
        return identifier;
    }

    if (ts.isPropertyAssignment(node)) {
        return node.getChildAt(0).getText();
    }

    if (ts.isPropertyDeclaration(node)) {
        return getIdentifier(node);
    }

    if (ts.isTypeAliasDeclaration(node)) {
        return getTypeAliasName(node);
    }

    return undefined;
}

export function getNameIfObjectMember(node: ts.Node): string | undefined {
    if (ts.isMethodDeclaration(node)) {
        return getMethodDeclarationName(node);
    }

    if (ts.isAccessor(node)) {
        return getFirstIdentifierName(node);
    }

    return undefined;
}

function getIdentifierDespiteBrackets(node: ts.Node): string | undefined {
    if (ts.isIdentifier(node)) {
        return node.getText();
    }

    if (ts.isParenthesizedExpression(node)) {
        return getIdentifierDespiteBrackets(node.getChildAt(1));
    }

    return undefined;
}

function getCalledFunctionName(node: ts.CallExpression): string {
    const children = node.getChildren();
    const expressionToCall = children[0];
    const name = getIdentifierDespiteBrackets(expressionToCall);

    return name ?? "";
}

function getClassDeclarationName(node: ts.ClassDeclaration): string {
    const name = getIdentifier(node);
    return name ?? ""; // anonymous class
}

function getClassExpressionName(
    node: ts.ClassExpression,
    variableBeingDefined: string | undefined = undefined
): string | undefined {
    return maybeGetFirstIdentifierName(node)
        ?? variableBeingDefined
        ?? undefined;
}

function getFunctionNodeName(
    func: FunctionNode,
    variableBeingDefined: string | undefined = undefined
): string {
    if (ts.isAccessor(func)) {
        return getFirstIdentifierName(func);
    }

    if (ts.isArrowFunction(func)) {
        return variableBeingDefined ?? "";
    }

    if (ts.isFunctionDeclaration(func)) {
        const functionKeywordIndex = func.getChildren()
            .findIndex(node => node.kind === ts.SyntaxKind.FunctionKeyword);
        const identifier = func.getChildAt(functionKeywordIndex + 1);

        return identifier.getText();
    }

    if (ts.isFunctionExpression(func)) {
        const maybeIdentifier = func.getChildren()[1];
        if (ts.isIdentifier(maybeIdentifier)) {
            return maybeIdentifier.getText();
        } else {
            return variableBeingDefined ?? "";
        }
    }

    const name = getMethodDeclarationName(func);
    if (name !== undefined) {
        return name;
    }

    throw new UnreachableNodeState(func, "FunctionNode is not of a recognised type.");
}

function getInterfaceDeclarationName(node: ts.InterfaceDeclaration): string {
    return node.getChildAt(1).getText();
}

function getFirstIdentifierName(node: ts.Node): string {
    const name = node.getChildren()
        .find(child => ts.isIdentifier(child));

    if (name === undefined) {
        throw new UnreachableNodeState(node, "Node was expected to have an identifier.");
    }

    return name.getText();
}

function getModuleDeclarationName(node: ts.ModuleDeclaration): string {
    const moduleKeywordIndex = node.getChildren()
        .findIndex(node => node.kind === ts.SyntaxKind.NamespaceKeyword
            || node.kind === ts.SyntaxKind.ModuleKeyword);

    if (moduleKeywordIndex === -1) {
        throw new UnreachableNodeState(node, "Module has no module/namespace keyword.");
    }

    const moduleIdentifier = node.getChildAt(moduleKeywordIndex + 1);
    return moduleIdentifier.getText();
}

function getMethodDeclarationName(node: ts.MethodDeclaration): string {
    const name = getIdentifier(node);

    if (name !== undefined) {
        return name;
    }

    throw new UnreachableNodeState(node, "Method has no identifier.");
}

function getNewedConstructorName(node: ts.NewExpression): string {
    return getTextWithoutBrackets(node.getChildAt(1));
}

function getTypeAliasName(node: ts.TypeAliasDeclaration): string {
    return node.getChildAt(1).getText();
}

export function getVariableDeclarationName(node: ts.VariableDeclaration): string {
    const identifier = node.getChildAt(0);
    return identifier.getText();
}

function maybeGetFirstIdentifierName(node: ts.Node): string | undefined {
    const name = node.getChildren()
        .find(child => ts.isIdentifier(child));

    return name?.getText();
}
