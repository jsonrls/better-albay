const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

test('TypeSafe AI credentials are never bundled into client-side assets', () => {
  const publicFiles = [
    'assets/js/main.js',
    'assets/js/statistics-data.js',
    'assets/js/statistics-ai.js',
    'assets/js/translations.js',
    'statistics/index.html',
    'index.html',
  ];

  for (const file of publicFiles) {
    const content = read(file);
    assert.doesNotMatch(
      content,
      /apikey_[a-f0-9]{32,}/i,
      `${file} leaks raw TypeSafe API key in public client code`
    );
    assert.doesNotMatch(
      content,
      /TYPESAFE_API_KEY\s*=/i,
      `${file} leaks environment variable assignment`
    );
  }
});

test('.gitignore excludes .env files and python cache', () => {
  const gitignore = read('.gitignore');
  assert.match(gitignore, /^\.env$/m, '.gitignore must exclude .env');
  assert.match(gitignore, /^\.env\*\.local$/m, '.gitignore must exclude .env*.local');
  assert.match(gitignore, /^\*\.env$/m, '.gitignore must exclude *.env');
  assert.match(gitignore, /^__pycache__\/$/m, '.gitignore must exclude __pycache__/');
});

test('TypeSafe service python script executes and returns valid structure for unknown queries', () => {
  const scriptPath = path.join(root, 'scripts/typesafe_service.py');
  assert.ok(fs.existsSync(scriptPath), 'scripts/typesafe_service.py must exist');

  const stdout = execFileSync('python3', [
    scriptPath,
    'What is the secret recipe for strawberry cheesecake?',
  ], { encoding: 'utf8' });

  const jsonStart = stdout.indexOf('{');
  assert.ok(jsonStart !== -1, 'typesafe_service.py output must contain JSON');
  const result = JSON.parse(stdout.slice(jsonStart));

  assert.equal(result.success, true);
  assert.equal(result.matched, false);
  assert.equal(result.choice, 'unknown');
  assert.ok(Array.isArray(result.suggested_queries) && result.suggested_queries.length > 0);
});

test('All statistics datasets cited by TypeSafe service exist on disk and have verified status', () => {
  const datasets = [
    'poverty_statistics.json',
    'economic_accounts.json',
    'cpi_inflation.json',
    'agriculture_palay.json',
    'population_2024.json',
    'cmci_2024.json',
  ];

  for (const filename of datasets) {
    const filepath = path.join(root, 'data', filename);
    assert.ok(fs.existsSync(filepath), `data/${filename} must exist`);
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    assert.ok(
      ['verified', 'final'].includes(data._status),
      `data/${filename} must have status verified or final`
    );
  }
});

test('statistics/index.html mounts the Ask Albay Open Data section and loads statistics-ai.js', () => {
  const page = read('statistics/index.html');
  assert.match(page, /id="ask-open-data"/, 'statistics page must have #ask-open-data section');
  assert.match(page, /id="stats-ai-form"/, 'statistics page must have #stats-ai-form search form');
  assert.match(page, /id="stats-ai-input"/, 'statistics page must have #stats-ai-input');
  assert.match(page, /id="stats-ai-result"/, 'statistics page must have #stats-ai-result region');
  assert.match(page, /src="[^"]*statistics-ai\.js/, 'statistics page must load statistics-ai.js');
});

test('homepage keeps AI assistant isolated to statistics dashboard without cluttering hero or glance grid', () => {
  const page = read('index.html');
  assert.doesNotMatch(page, /home-search-tag-ai/, 'homepage must not contain AI hero tag');
  assert.doesNotMatch(page, /home-stats-ai-banner/, 'homepage must not contain AI stats banner');
  assert.match(page, /href="statistics\/"/, 'homepage still links directly to statistics dashboard');
});
