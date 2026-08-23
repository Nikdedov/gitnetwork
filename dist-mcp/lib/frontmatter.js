export class FrontmatterError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FrontmatterError';
    }
}
const OPEN = '---';
function stripQuotes(value) {
    if (value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'")))) {
        return value.slice(1, -1);
    }
    return value;
}
export function parseFrontmatter(raw) {
    const text = raw.replace(/\r\n/g, '\n');
    if (!text.startsWith(OPEN + '\n')) {
        return { data: {}, body: text };
    }
    const end = text.indexOf('\n' + OPEN, 3);
    if (end === -1) {
        throw new FrontmatterError('Unterminated frontmatter block');
    }
    const block = text.slice(4, end);
    const body = text.slice(end + 4).replace(/^\n+/, '');
    const data = {};
    for (const line of block.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const idx = trimmed.indexOf(':');
        if (idx === -1) {
            throw new FrontmatterError(`Invalid frontmatter line: ${trimmed}`);
        }
        const key = trimmed.slice(0, idx).trim();
        const value = stripQuotes(trimmed.slice(idx + 1).trim());
        if (!key)
            throw new FrontmatterError('Empty frontmatter key');
        data[key] = value;
    }
    return { data, body };
}
export function serializeFrontmatter(data, body) {
    const lines = Object.entries(data).map(([k, v]) => `${k}: ${v}`);
    return `---\n${lines.join('\n')}\n---\n${body}`;
}
