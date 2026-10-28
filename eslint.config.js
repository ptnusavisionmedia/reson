const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Aturan import/* yang memakai unrs-resolver dimatikan karena binding native-nya
// gagal dimuat di mesin ini ("specified module could not be found"). Resolusi modul
// tetap divalidasi oleh `tsc --noEmit`.
const resolverRules = Object.fromEntries(
  ['no-unresolved', 'no-duplicates', 'namespace', 'named', 'default', 'export', 'no-named-as-default', 'no-named-as-default-member'].map(
    (r) => [`import/${r}`, 'off'],
  ),
);

module.exports = defineConfig([
  expoConfig,
  { rules: resolverRules },
  { ignores: ['dist/*', '.expo/*', 'supabase/*', 'src/types/database.ts'] },
]);
