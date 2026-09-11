import { memo, type ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { CodeBlock } from "./CodeBlock";

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex, [rehypeHighlight, { detect: false, ignoreMissing: true }]] as ComponentProps<typeof ReactMarkdown>["rehypePlugins"];

/** Extracts the raw text of a <code> element's children for the copy button. */
function extractText(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: unknown } }).props;
    return extractText(props?.children);
  }
  return "";
}

const components: ComponentProps<typeof ReactMarkdown>["components"] = {
  pre({ children }) {
    const child = Array.isArray(children) ? children[0] : children;
    const className: string = (child as { props?: { className?: string } })?.props?.className ?? "";
    const language = /language-([\w-]+)/.exec(className)?.[1] ?? "";
    const code = extractText(child).replace(/\n$/, "");
    return (
      <CodeBlock language={language} code={code}>
        <pre>{children}</pre>
      </CodeBlock>
    );
  },
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="my-3 overflow-x-auto">
        <table>{children}</table>
      </div>
    );
  },
};

/** Renders assistant Markdown with GFM tables, task lists, KaTeX math, highlighted code and Mermaid. */
export const MarkdownContent = memo(function MarkdownContent({ text }: { text: string }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
});
