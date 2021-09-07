// @flow

import type Parser from "./parser";

export type Plugin = string | [string, Object];

export type PluginList = $ReadOnlyArray<Plugin>;

export type MixinPlugin = (superClass: Class<Parser>) => Class<Parser>;

// 判断插件列表中是否含有一个名为 name 的插件，validatePlugins中有使用
export function hasPlugin(plugins: PluginList, name: string): boolean {
  return plugins.some(plugin => {
    if (Array.isArray(plugin)) {
      return plugin[0] === name;
    } else {
      return plugin === name;
    }
  });
}

// 获取插件的选项值，validatePlugins中有使用
export function getPluginOption(
  plugins: PluginList,
  name: string,
  option: string,
) {
  const plugin = plugins.find(plugin => {
    if (Array.isArray(plugin)) {
      return plugin[0] === name;
    } else {
      return plugin === name;
    }
  });

  if (plugin && Array.isArray(plugin)) {
    return plugin[1][option];
  }

  return null;
}

const PIPELINE_PROPOSALS = ["minimal", "smart", "fsharp"];
const RECORD_AND_TUPLE_SYNTAX_TYPES = ["hash", "bar"];

// 校验 plugins
export function validatePlugins(plugins: PluginList) {
  // 如果有decorators plugin
  if (hasPlugin(plugins, "decorators")) {
    //那么不能有 decorators-legacy plugin
    if (hasPlugin(plugins, "decorators-legacy")) {
      throw new Error(
        "Cannot use the decorators and decorators-legacy plugin together",
      );
    }

    const decoratorsBeforeExport = getPluginOption(
      plugins,
      "decorators",
      "decoratorsBeforeExport",
    );
    // 必须有一个值为 bool 类型的 decoratorsBeforeExport 选项
    if (decoratorsBeforeExport == null) {
      throw new Error(
        "The 'decorators' plugin requires a 'decoratorsBeforeExport' option," +
          " whose value must be a boolean. If you are migrating from" +
          " Babylon/Babel 6 or want to use the old decorators proposal, you" +
          " should use the 'decorators-legacy' plugin instead of 'decorators'.",
      );
    } else if (typeof decoratorsBeforeExport !== "boolean") {
      throw new Error("'decoratorsBeforeExport' must be a boolean.");
    }
  }

  // 不能同时使用 flow 插件和 typescript 插件
  if (hasPlugin(plugins, "flow") && hasPlugin(plugins, "typescript")) {
    throw new Error("Cannot combine flow and typescript plugins.");
  }

  // 不能同时使用 placeholders 插件和 v8intrinsic 插件
  if (hasPlugin(plugins, "placeholders") && hasPlugin(plugins, "v8intrinsic")) {
    throw new Error("Cannot combine placeholders and v8intrinsic plugins.");
  }
  // 如果有 pipelineOperator 插件，那么必须有包含在 PIPELINE_PROPOSALS 中的 proposal 属性
  if (
    hasPlugin(plugins, "pipelineOperator") &&
    !PIPELINE_PROPOSALS.includes(
      getPluginOption(plugins, "pipelineOperator", "proposal"),
    )
  ) {
    throw new Error(
      "'pipelineOperator' requires 'proposal' option whose value should be one of: " +
        PIPELINE_PROPOSALS.map(p => `'${p}'`).join(", "),
    );
  }
  // 有 moduleAttributes 插件的相关限制
  if (hasPlugin(plugins, "moduleAttributes")) {
    if (process.env.BABEL_8_BREAKING) {
      throw new Error(
        "`moduleAttributes` has been removed in Babel 8, please use `importAssertions` parser plugin, or `@babel/plugin-syntax-import-assertions`.",
      );
    } else {
      if (hasPlugin(plugins, "importAssertions")) {
        throw new Error(
          "Cannot combine importAssertions and moduleAttributes plugins.",
        );
      }
      const moduleAttributesVerionPluginOption = getPluginOption(
        plugins,
        "moduleAttributes",
        "version",
      );
      if (moduleAttributesVerionPluginOption !== "may-2020") {
        throw new Error(
          "The 'moduleAttributes' plugin requires a 'version' option," +
            " representing the last proposal update. Currently, the" +
            " only supported value is 'may-2020'.",
        );
      }
    }
  }
  // recordAndTuple插件的相关限制
  if (
    hasPlugin(plugins, "recordAndTuple") &&
    !RECORD_AND_TUPLE_SYNTAX_TYPES.includes(
      getPluginOption(plugins, "recordAndTuple", "syntaxType"),
    )
  ) {
    throw new Error(
      "'recordAndTuple' requires 'syntaxType' option whose value should be one of: " +
        RECORD_AND_TUPLE_SYNTAX_TYPES.map(p => `'${p}'`).join(", "),
    );
  }
  // asyncDoExpressions插件的相关限制
  if (
    hasPlugin(plugins, "asyncDoExpressions") &&
    !hasPlugin(plugins, "doExpressions")
  ) {
    const error = new Error(
      "'asyncDoExpressions' requires 'doExpressions', please add 'doExpressions' to parser plugins.",
    );
    // $FlowIgnore
    error.missingPlugins = "doExpressions"; // so @babel/core can provide better error message
    throw error;
  }
}

// These plugins are defined using a mixin which extends the parser class.

import estree from "./plugins/estree";
import flow from "./plugins/flow";
import jsx from "./plugins/jsx";
import typescript from "./plugins/typescript";
import placeholders from "./plugins/placeholders";
import v8intrinsic from "./plugins/v8intrinsic";

// NOTE: order is important. estree must come first; placeholders must come last.
export const mixinPlugins: { [name: string]: MixinPlugin } = {
  estree,
  jsx,
  flow,
  typescript,
  v8intrinsic,
  placeholders,
};

export const mixinPluginNames: $ReadOnlyArray<string> =
  Object.keys(mixinPlugins);
