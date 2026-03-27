import MarkdownIt from 'markdown-it'
import footnote from 'markdown-it-footnote'
import { getHighlighter } from 'shiki'

let highlighter: any = null

// Initialize Shiki asynchronously
export async function initMarkdown() {
  if (!highlighter) {
    highlighter = await getHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: ['javascript', 'typescript', 'python', 'rust', 'json', 'bash', 'yaml', 'toml', 'html', 'css', 'vue', 'markdown']
    })
  }
}

const md = new MarkdownIt({
  html: false, // Security: disable raw HTML
  breaks: true, // Use soft line breaks as hard breaks
  linkify: true, // Autoconvert URL-like text to links
  highlight: (str, lang) => {
    if (highlighter && lang && highlighter.getLoadedLanguages().includes(lang)) {
      try {
        // Will use CSS variables or a specific theme
        return highlighter.codeToHtml(str, { lang, theme: 'github-dark' })
      } catch (err) {
        console.error(err)
      }
    }
    // Fallback if highlighter isn't ready or lang not found
    return `<pre class="shiki"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})

md.use(footnote)

export function renderMarkdown(content: string): string {
  return md.render(content)
}

// Add a helper for inline matching/rendering if needed
export function renderInline(content: string): string {
  return md.renderInline(content)
}
