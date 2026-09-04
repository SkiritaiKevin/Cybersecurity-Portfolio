# Minesweeper Checks

The site is static and has no production install or build step. These offline
DOM tests use Node's test runner and jsdom. They cover the actual page controller,
vendored engine, and shared music script; Web Audio is mocked. They do not test
browser layout or actual speaker output.

From the repository root in PowerShell:

```powershell
npm install --prefix tmp/minesweeper-test --ignore-scripts --no-audit --no-fund jsdom@26.1.0
$env:JSDOM_PATH = "$PWD/tmp/minesweeper-test/node_modules/jsdom"
node --test tests/minesweeper.test.cjs
```

The temporary dependency installation is excluded from git and deployment.
