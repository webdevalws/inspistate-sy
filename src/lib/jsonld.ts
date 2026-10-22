// Serialises structured data for <script type="application/ld+json" set:html={jsonLd(data)} />.
// JSON.stringify alone lets user text such as a forum title "</script><script>…" close the tag, so
// <, >, & and the U+2028 / U+2029 line separators are written as backslash-u escapes. The JSON value is unchanged.
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const esc = (c: string) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0');
const UNSAFE = new RegExp(`[<>&${LS}${PS}]`, 'g');

export const jsonLd = (data: unknown): string => JSON.stringify(data).replace(UNSAFE, esc);
