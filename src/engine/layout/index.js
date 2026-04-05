const {
  strWidth,
  stripAnsi,
  padEndDisplay,
  center,
  repeatChar
} = require('../rendering/ScreenBuffer');

const BORDER_STYLES = {
  none: null,
  single: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    leftDivider: '├',
    rightDivider: '┤'
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
    leftDivider: '╠',
    rightDivider: '╣'
  },
  rounded: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
    leftDivider: '├',
    rightDivider: '┤'
  },
  ascii: {
    topLeft: '+',
    topRight: '+',
    bottomLeft: '+',
    bottomRight: '+',
    horizontal: '-',
    vertical: '|',
    leftDivider: '+',
    rightDivider: '+'
  }
};

function normalizeLines(lines) {
  if (lines == null) return [];
  if (Array.isArray(lines)) {
    return lines.map((line) => String(line == null ? '' : line));
  }
  return [String(lines)];
}

function resolveBorder(border) {
  if (border === false || border === 'none' || border == null) {
    return null;
  }

  if (border === true) {
    return BORDER_STYLES.single;
  }

  if (typeof border === 'string') {
    return BORDER_STYLES[border] || BORDER_STYLES.single;
  }

  if (typeof border === 'object') {
    if (border.style === false || border.style === 'none') {
      return null;
    }
    return BORDER_STYLES[border.style || 'single'] || BORDER_STYLES.single;
  }

  return BORDER_STYLES.single;
}

function borderThickness(border) {
  return resolveBorder(border) ? 1 : 0;
}

function measureText(text) {
  return strWidth(stripAnsi(String(text == null ? '' : text)));
}

function measureLines(lines) {
  const normalized = normalizeLines(lines);
  return {
    width: normalized.length ? Math.max(...normalized.map((line) => measureText(line))) : 0,
    height: normalized.length
  };
}

function styleText(text, options = {}) {
  const value = String(text == null ? '' : text);
  if (!value) return '';

  const prefix = `${options.bold ? '\x1b[1m' : ''}${options.color || ''}`;
  const suffix = prefix ? '\x1b[0m' : '';
  return `${prefix}${value}${suffix}`;
}

function alignText(text, width, align = 'left') {
  const value = String(text == null ? '' : text);
  const visualWidth = measureText(value);

  if (width <= 0) return '';
  if (visualWidth >= width) return padEndDisplay(value, width);

  if (align === 'center') {
    return center(value, width);
  }

  if (align === 'right') {
    return `${repeatChar(' ', width - visualWidth)}${value}`;
  }

  return padEndDisplay(value, width);
}

function padBlock(lines, width, align = 'left') {
  return normalizeLines(lines).map((line) => alignText(line, width, align));
}

function stackBlocks(blocks, options = {}) {
  const gap = Math.max(0, Number(options.gap) || 0);
  const out = [];
  const normalized = Array.isArray(blocks) ? blocks : [];

  normalized.forEach((block, index) => {
    const lines = normalizeLines(block);
    if (index > 0) {
      for (let i = 0; i < gap; i++) {
        out.push('');
      }
    }
    out.push(...lines);
  });

  return out;
}

function frameLines(lines, options = {}) {
  const border = resolveBorder(options.border);
  const paddingX = Math.max(0, Number(options.paddingX) || 0);
  const paddingY = Math.max(0, Number(options.paddingY) || 0);
  const borderColor = options.borderColor || '';
  const contentAlign = options.align || 'left';
  const contentLines = normalizeLines(lines);
  const contentWidth = options.contentWidth == null
    ? measureLines(contentLines).width
    : Math.max(0, Number(options.contentWidth) || 0);
  const bodyWidth = Math.max(0, contentWidth + (paddingX * 2));
  const framed = [];

  if (border) {
    framed.push(`${borderColor}${border.topLeft}${repeatChar(border.horizontal, bodyWidth)}${border.topRight}\x1b[0m`);
  }

  for (let i = 0; i < paddingY; i++) {
    framed.push(wrapFrameLine(repeatChar(' ', bodyWidth), border, borderColor));
  }

  for (const line of contentLines) {
    const aligned = alignText(line, contentWidth, contentAlign);
    framed.push(wrapFrameLine(`${repeatChar(' ', paddingX)}${aligned}${repeatChar(' ', paddingX)}`, border, borderColor));
  }

  for (let i = 0; i < paddingY; i++) {
    framed.push(wrapFrameLine(repeatChar(' ', bodyWidth), border, borderColor));
  }

  if (border) {
    framed.push(`${borderColor}${border.bottomLeft}${repeatChar(border.horizontal, bodyWidth)}${border.bottomRight}\x1b[0m`);
  }

  if (!border && contentLines.length === 0) {
    return [''];
  }

  return border ? framed : contentLines;
}

function wrapFrameLine(line, border, borderColor) {
  if (!border) return line;
  return `${borderColor}${border.vertical}\x1b[0m${line}${borderColor}${border.vertical}\x1b[0m`;
}

function dividerLine(width, options = {}) {
  const border = resolveBorder(options.border);
  if (!border) {
    return repeatChar('─', Math.max(0, width));
  }

  return `${options.borderColor || ''}${border.leftDivider}${repeatChar(border.horizontal, Math.max(0, width))}${border.rightDivider}\x1b[0m`;
}

function frameMetrics(contentWidth, contentHeight, options = {}) {
  const paddingX = Math.max(0, Number(options.paddingX) || 0);
  const paddingY = Math.max(0, Number(options.paddingY) || 0);
  const thickness = borderThickness(options.border);
  return {
    width: contentWidth + (paddingX * 2) + (thickness * 2),
    height: contentHeight + (paddingY * 2) + (thickness * 2)
  };
}

function resolvePosition(containerWidth, containerHeight, boxWidth, boxHeight, options = {}) {
  const alignX = options.alignX || 'center';
  const alignY = options.alignY || 'center';
  const offsetX = Number(options.offsetX) || 0;
  const offsetY = Number(options.offsetY) || 0;

  let x = 0;
  let y = 0;

  if (alignX === 'right') {
    x = containerWidth - boxWidth;
  } else if (alignX === 'center') {
    x = Math.floor((containerWidth - boxWidth) / 2);
  }

  if (alignY === 'bottom') {
    y = containerHeight - boxHeight;
  } else if (alignY === 'center') {
    y = Math.floor((containerHeight - boxHeight) / 2);
  }

  return {
    x: Math.max(0, x + offsetX),
    y: Math.max(0, y + offsetY)
  };
}

module.exports = {
  BORDER_STYLES,
  normalizeLines,
  resolveBorder,
  borderThickness,
  measureText,
  measureLines,
  styleText,
  alignText,
  padBlock,
  stackBlocks,
  frameLines,
  dividerLine,
  frameMetrics,
  resolvePosition
};
