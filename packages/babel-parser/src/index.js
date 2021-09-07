// @flow

import { type Options } from "./options";
import {
  hasPlugin,
  validatePlugins,
  mixinPluginNames,
  mixinPlugins,
  type PluginList,
} from "./plugin-utils";
import Parser from "./parser";

import { types as tokTypes } from "./tokenizer/types";
import "./tokenizer/context";

import type { Expression, File } from "./types";

//入口函数
export function parse(input: string, options?: Options): File {
  //TODO：这一堆判断是为了啥？
  if (options?.sourceType === "unambiguous") {
    options = {
      ...options,
    };
    try {
      //首先尝试用 sourceType 为 module 的 parser 来 parse一把
      options.sourceType = "module";
      const parser = getParser(options, input);
      const ast = parser.parse();

      if (parser.sawUnambiguousESM) {
        return ast;
      }

      if (parser.ambiguousScriptDifferentAst) {
        // Top level await introduces code which can be both a valid script and
        // a valid module, but which produces different ASTs:
        //    await
        //    0
        // can be parsed either as an AwaitExpression, or as two ExpressionStatements.
        // 顶层 await 引入的代码既可以是有效脚本，也可以是有效模块，但会产生不同的 AST：await 0 可以解析为 await 表达式，也可以解析为两个表达式语句。
        // 如果不对，用 sourceType 为 script 的 parser 再来 parse一把
        try {
          options.sourceType = "script";
          return getParser(options, input).parse();
        } catch {}
      } else {
        // This is both a valid module and a valid script, but
        // we parse it as a script by default
        ast.program.sourceType = "script";
      }

      return ast;
    } catch (moduleError) {
      try {
        options.sourceType = "script";
        return getParser(options, input).parse();
      } catch {}

      throw moduleError;
    }
  } else {
    return getParser(options, input).parse();
  }
}

export function parseExpression(input: string, options?: Options): Expression {
  const parser = getParser(options, input);
  if (parser.options.strictMode) {
    parser.state.strict = true;
  }
  return parser.getExpression();
}

export { tokTypes };

// 获取解析器对象，有个特殊的分支是根据plugin来判断生成返回
function getParser(options: ?Options, input: string): Parser {
  let cls = Parser;
  if (options?.plugins) {
    validatePlugins(options.plugins);
    cls = getParserClass(options.plugins);
  }

  return new cls(options, input);
}

// 应用了插件的Parser类缓存，key是插件名列表用 / 拼接
const parserClassCache: { [key: string]: Class<Parser> } = {};

/** 获取一个应用了各种插件的 Parser 类 Get a Parser class with plugins applied. */
function getParserClass(pluginsFromOptions: PluginList): Class<Parser> {
  // 从内置的 mixinPlugin 中挑选出选项传入的options
  const pluginList = mixinPluginNames.filter(name =>
    hasPlugin(pluginsFromOptions, name),
  );
  // 用 / 拼接plugin名字列表，获取并缓存应用了插件列表的 Parser 类
  const key = pluginList.join("/");
  let cls = parserClassCache[key];
  if (!cls) {
    cls = Parser;
    for (const plugin of pluginList) {
      cls = mixinPlugins[plugin](cls);
    }
    parserClassCache[key] = cls;
  }
  return cls;
}
