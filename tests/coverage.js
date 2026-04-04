const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const inspector = require('inspector');
const { runAllTests } = require('./run-tests');

function promisifyPost(session, method, params = {}) {
  return new Promise((resolve, reject) => {
    session.post(method, params, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

function getLineSpans(source) {
  const spans = [];
  let start = 0;
  for (let i = 0; i <= source.length; i++) {
    if (i === source.length || source[i] === '\n') {
      spans.push({ start, end: i, text: source.slice(start, i) });
      start = i + 1;
    }
  }
  return spans;
}

function isRelevantLine(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed === '{' || trimmed === '}' || trimmed === '];' || trimmed === '},' || trimmed === ');') return false;
  if (trimmed.startsWith('//')) return false;
  if (trimmed === '/*' || trimmed === '*/' || trimmed.startsWith('*')) return false;
  return true;
}

function getEffectiveSegments(ranges) {
  const boundaries = new Set();
  for (const range of ranges) {
    boundaries.add(range.startOffset);
    boundaries.add(range.endOffset);
  }

  const points = Array.from(boundaries).sort((a, b) => a - b);
  const segments = [];

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    if (end <= start) continue;

    const midpoint = start + (end - start) / 2;
    let winner = null;

    for (const range of ranges) {
      if (range.startOffset <= midpoint && midpoint < range.endOffset) {
        if (!winner) {
          winner = range;
          continue;
        }

        const winnerSize = winner.endOffset - winner.startOffset;
        const candidateSize = range.endOffset - range.startOffset;
        if (candidateSize <= winnerSize) {
          winner = range;
        }
      }
    }

    segments.push({
      start,
      end,
      count: winner ? winner.count : 0
    });
  }

  return segments;
}

function lineCovered(spans, coveredRanges) {
  const segments = getEffectiveSegments(coveredRanges);
  let relevant = 0;
  let covered = 0;

  for (const span of spans) {
    if (!isRelevantLine(span.text)) continue;
    relevant++;
    const hit = segments.some((segment) => segment.count > 0 && segment.end > span.start && segment.start < span.end);
    if (hit) covered++;
  }

  return { relevant, covered };
}

async function main() {
  const session = new inspector.Session();
  session.connect();

  await promisifyPost(session, 'Profiler.enable');
  await promisifyPost(session, 'Profiler.startPreciseCoverage', { callCount: true, detailed: true });

  const success = runAllTests();
  const report = await promisifyPost(session, 'Profiler.takePreciseCoverage');

  await promisifyPost(session, 'Profiler.stopPreciseCoverage');
  session.disconnect();

  const root = path.resolve(__dirname, '../src/engine');
  const allFiles = [];
  for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.js')) {
      allFiles.push(path.join(entry.parentPath, entry.name));
    }
  }
  const byFile = [];
  let totalRelevant = 0;
  let totalCovered = 0;
  const seen = new Set();

  for (const script of report.result) {
    if (!script.url) continue;
    const scriptPath = script.url.startsWith('file://') ? fileURLToPath(script.url) : script.url;
    if (!scriptPath.startsWith(root) || !scriptPath.endsWith('.js')) continue;
    const source = fs.readFileSync(scriptPath, 'utf8');
    const spans = getLineSpans(source);
    const ranges = script.functions.flatMap((fn) => fn.ranges);
    const counts = lineCovered(spans, ranges);
    seen.add(scriptPath);
    totalRelevant += counts.relevant;
    totalCovered += counts.covered;
    byFile.push({
      file: path.relative(path.resolve(__dirname, '..'), scriptPath),
      relevant: counts.relevant,
      covered: counts.covered,
      percent: counts.relevant === 0 ? 100 : (counts.covered / counts.relevant) * 100
    });
  }

  for (const filePath of allFiles) {
    if (seen.has(filePath)) continue;
    const source = fs.readFileSync(filePath, 'utf8');
    const spans = getLineSpans(source);
    const relevant = spans.filter((span) => isRelevantLine(span.text)).length;
    totalRelevant += relevant;
    byFile.push({
      file: path.relative(path.resolve(__dirname, '..'), filePath),
      relevant,
      covered: 0,
      percent: relevant === 0 ? 100 : 0
    });
  }

  byFile.sort((a, b) => a.percent - b.percent);
  console.log('');
  console.log('Coverage Report (src/engine)');
  console.log('='.repeat(50));
  for (const item of byFile) {
    console.log(`${item.percent.toFixed(1).padStart(6)}%  ${item.covered}/${item.relevant}  ${item.file}`);
  }

  const totalPercent = totalRelevant === 0 ? 100 : (totalCovered / totalRelevant) * 100;
  console.log('='.repeat(50));
  console.log(`TOTAL ${totalPercent.toFixed(1)}%  ${totalCovered}/${totalRelevant}`);

  if (!success || totalPercent < 70) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
