import functions from "../functions/index.js";
import { TranspilerOptions } from "../typings/interfaces.js";
import {
    getFunctionList,
    parseResult,
    getFunctionData,
    ExecuteData,
} from "../util/transpilerHelpers.js";
import { TranspilerError } from "./error.js";
import { minify, MinifyOutput } from "uglify-js";
import fixMath from "./parsers/mathParser.js";
import Scope from "./structs/Scope.js";
const functionNames = Object.keys(functions);
export function Transpiler(
    code: string,
    options: TranspilerOptions,
): { func: Function; code: string; scope: Scope[] } {
    const { scopeData, sendMessage, minify: uglify } = options;
    const flist = getFunctionList(code, functionNames);

    flist.forEach((x) => {
        const reg = new RegExp(`${x.replace("$", "\\$")}`, "gi");
        code = parseResult(code);
        code = code.replace(reg, x);
    });

    const tempcode = `$EXECUTEMAINCODEFUNCTION[
        ${code}
    ]`;
    let FData = getFunctionData(tempcode, "$EXECUTEMAINCODEFUNCTION", flist);
    const globalScope = new Scope(scopeData?.name ?? "global", undefined, code);
    globalScope.addVariables(scopeData?.variables ?? []);
    globalScope.addEmbeds(scopeData?.embeds ?? []);
    globalScope.env.push(...(scopeData?.env ?? []));
    globalScope.objects = { ...globalScope.objects, ...scopeData?.objects };

    globalScope.sendFunction =
        scopeData?.sendFunction ?? globalScope.sendFunction;
    const res = ExecuteData(parseResult(code), FData.funcs, [globalScope]);

    if (res.scope[0].sendData.content.trim() !== "") {
        const scope = res.scope[0];
        scope.hasSendData = true;
        scope.rest.replace(scope.sendData.content.trim(), "");
        res.scope[0] = scope;
    }
    let str = res.scope[0].getFunction(sendMessage);
    str = fixMath(str);
    const functionString = uglify ? minify(str) : str;

    if (uglify && (<MinifyOutput>functionString).error) {
        throw new TranspilerError(
            `code:${str} 
<------------------------------------------------------->
      Failed To Transpile Code with error ${
          (<MinifyOutput>functionString).error
      }`,
        );
    }
    let func;
    try {
        func = new Function(
            "return " +
                (uglify
                    ? (<MinifyOutput>functionString).code
                    : <string>functionString),
        )();
    } catch (e: any) {
        throw new TranspilerError(e);
    }

    return { func, ...res };
}