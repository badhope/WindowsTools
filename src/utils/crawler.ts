export function detectPageStructure(html: string): any[] {
  const fields: any[] = [];

  const patterns = [
    { selector: 'h1', name: '标题1', attr: 'text' },
    { selector: 'h2', name: '标题2', attr: 'text' },
    { selector: 'h3', name: '标题3', attr: 'text' },
    { selector: '.title', name: 'class=title', attr: 'text' },
    { selector: '.item-title', name: '商品标题', attr: 'text' },
    { selector: 'div.title', name: 'div标题', attr: 'text' },
    { selector: '.price', name: '价格', attr: 'text' },
    { selector: 'span.price', name: '价格span', attr: 'text' },
    { selector: 'a[href]', name: '链接', attr: 'href' },
    { selector: 'img[src]', name: '图片', attr: 'src' },
  ];

  for (const p of patterns) {
    if (html.includes(p.selector.replace(/[.#]/g, ''))) {
      fields.push({
        name: p.name,
        selector: p.selector,
        selectorType: 'css',
        attribute: p.attr,
        required: false
      });
    }
  }

  return fields;
}

export interface Field {
  id: string;
  name: string;
  selector: string;
  selectorType: string;
  attribute: string;
  required: boolean;
}

export function extractFields(html: string, fields: Field[]): Record<string, any>[] {
  const results: Record<string, any>[] = [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  if (fields.length === 0) return results;

  const firstField = fields[0];
  let elements: NodeListOf<Element>;

  try {
    if (firstField.selectorType === 'css') {
      elements = doc.querySelectorAll(firstField.selector);
    } else {
      elements = doc.querySelectorAll('body');
    }
  } catch {
    elements = doc.querySelectorAll('body');
  }

  elements.forEach((_el, idx) => {
    const row: Record<string, any> = {};

    for (const field of fields) {
      let value = '';

      try {
        const fieldElements = doc.querySelectorAll(field.selector);
        if (fieldElements[idx]) {
          const targetEl = fieldElements[idx];
          switch (field.attribute) {
            case 'text':
              value = targetEl.textContent?.trim() || '';
              break;
            case 'href':
              value = (targetEl as HTMLAnchorElement).href || '';
              break;
            case 'src':
              value = (targetEl as HTMLImageElement).src || '';
              break;
            case 'html':
              value = targetEl.innerHTML;
              break;
            default:
              value = targetEl.textContent?.trim() || '';
          }
        }
      } catch {}

      row[field.name] = value;
    }

    results.push(row);
  });

  return results;
}

export function findNextPage(html: string, selector: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  try {
    const nextLink = doc.querySelector(selector);
    if (nextLink) {
      const href = (nextLink as HTMLAnchorElement).href;
      return href || null;
    }
  } catch {}

  return null;
}

export function exportToCSV(data: Record<string, any>[], fileName: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = String(row[h] || '').replace(/"/g, '""');
        return `"${val}"`;
      }).join(',')
    )
  ].join('\n');

  downloadFile(csvContent, `${fileName}.csv`, 'text/csv;charset=utf-8');
}

export function exportToJSON(data: Record<string, any>[], fileName: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${fileName}.json`, 'application/json');
}

export function exportToHTML(data: Record<string, any>[], fileName: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  let html = '<table border="1">\n<tr>';
  html += headers.map(h => `<th>${escapeHtml(h)}</th>`).join('');
  html += '</tr>\n';

  for (const row of data) {
    html += '<tr>' + headers.map(h => `<td>${escapeHtml(String(row[h] || ''))}</td>`).join('') + '</tr>\n';
  }

  html += '</table>';
  downloadFile(html, `${fileName}.html`, 'text/html;charset=utf-8');
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
