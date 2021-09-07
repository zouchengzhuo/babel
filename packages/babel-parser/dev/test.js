#!/usr/bin/env node
/* eslint no-var: 0 */

import { parse } from "../src";
import fs from "fs";
import path from "path";

var file = fs.readFileSync(path.resolve(__dirname, "./data/testFn.js"), "utf8");
var ast = parse(file);

console.log(JSON.stringify(ast, null, "  "));
