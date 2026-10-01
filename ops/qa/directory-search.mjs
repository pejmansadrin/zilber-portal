import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const exports = {};
const code = ts.transpileModule(await readFile("src/lib/directory-search.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
vm.runInNewContext(code, { exports });
const { normalizeDirectorySearch: normalize, matchesDirectorySearch: matches } = exports;
assert.equal(normalize("پژمان صَدري‌نژاد"), normalize("پژمان صدری نژاد"));
assert.equal(normalize("كيـهان"), normalize("کیهان"));
assert.equal(normalize("EMP-۱۲۳٤۵"), "emp-12345");
assert(matches(["پژمان صدری‌نژاد", null], "صدري نژاد"));
assert(matches([null, "Admin@Example.com"], "ADMIN@example"));
assert(matches(["EMP-12345"], "۱۲۳۴۵"));
assert(matches(["واحد فناوری"], "فنّاوری"));
assert(matches([null, undefined], "  "));
assert(!matches([null, "پژمان"], "نرگس"));
assert(!matches(["EMP-123"], "EMP-124"));
assert(!matches(["admin+hr@example.com"], "admin.hr"));
console.log("PASS: Persian/Arabic letters, digits, diacritics, half-spaces, email case, blank and unmatched directory queries.");
