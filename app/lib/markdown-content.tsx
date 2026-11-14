import type { ReactNode } from "react";

function renderInlineMarkdown(value: string, keyPrefix: string): ReactNode[] {
  const tokenPattern = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g;
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(value)) !== null) {
    if (match.index > cursor) {
      parts.push(value.slice(cursor, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);

    if (linkMatch) {
      const url = linkMatch[2].trim();
      if (/^(https?:\/\/|mailto:)/i.test(url)) {
        parts.push(
          <a href={url} key={key} target="_blank" rel="noreferrer">
            {linkMatch[1]}
          </a>,
        );
      } else {
        parts.push(linkMatch[1]);
      }
    } else if (token.startsWith("**") || token.startsWith("__")) {
      parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("~~")) {
      parts.push(<del key={key}>{token.slice(2, -2)}</del>);
    } else if (token.startsWith("`")) {
      parts.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("*")) {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    }

    cursor = match.index + token.length;
  }

  if (cursor < value.length) {
    parts.push(value.slice(cursor));
  }

  return parts;
}

export function MarkdownContent({ value }: { value: string }) {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  let blockNumber = 0;

  const isSpecialLine = (input: string) => {
    const trimmed = input.trim();
    return (
      /^```/.test(trimmed) ||
      /^(#{1,6})\s+/.test(trimmed) ||
      /^>\s?/.test(trimmed) ||
      /^([-*+]|•|\d+\.)\s+/.test(trimmed) ||
      /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)
    );
  };

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const codeFence = /^```([a-z0-9_-]*)$/i.exec(line);
    if (codeFence) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(
        <pre key={`block-${blockNumber++}`}>
          <code className={codeFence[1] ? `language-${codeFence[1]}` : undefined}>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const HeadingTag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      blocks.push(
        <HeadingTag key={`block-${blockNumber++}`}>
          {renderInlineMarkdown(heading[2], `heading-${blockNumber}`)}
        </HeadingTag>,
      );
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      blocks.push(<hr key={`block-${blockNumber++}`} />);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={`block-${blockNumber++}`}>
          {quoteLines.map((quoteLine, quoteIndex) => (
            <p key={`quote-${quoteIndex}`}>
              {renderInlineMarkdown(quoteLine, `quote-${blockNumber}-${quoteIndex}`)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    const listMatch = /^([•*-]|\d+\.)\s+(.+)$/.exec(line);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1]);
      const items: ReactNode[] = [];
      while (index < lines.length) {
        const currentLine = lines[index].trim();
        const item = /^([•*-]|\d+\.)\s+(.+)$/.exec(currentLine);
        if (!item || /^\d/.test(item[1]) !== ordered) break;
        items.push(
          <li key={`item-${items.length}`}>
            {renderInlineMarkdown(item[2], `list-${blockNumber}-${items.length}`)}
          </li>,
        );
        index += 1;
      }
      const key = `block-${blockNumber++}`;
      blocks.push(ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>);
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const currentLine = lines[index].trim();
      if (!currentLine) {
        break;
      }
      if (isSpecialLine(currentLine)) {
        break;
      }
      paragraphLines.push(currentLine);
      index += 1;
    }

    const paragraphNumber = blockNumber++;
    blocks.push(
      <p key={`block-${paragraphNumber}`}>
        {renderInlineMarkdown(paragraphLines.join(" "), `paragraph-${paragraphNumber}`)}
      </p>,
    );
  }

  return (
    <div
      className="mt-3.5 break-words text-[15px] leading-[1.75] text-[#3d414d] max-[600px]:text-[14px] dark:text-[#d7d9df] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mb-3 [&_h1]:mt-5 [&_h1]:mb-[9px] [&_h1]:leading-[1.3] [&_h1]:text-[1.65em] [&_h2]:mt-5 [&_h2]:mb-[9px] [&_h2]:leading-[1.3] [&_h2]:text-[1.45em] [&_h3]:mt-5 [&_h3]:mb-[9px] [&_h3]:leading-[1.3] [&_h3]:text-[1.25em] [&_h4]:mt-5 [&_h4]:mb-[9px] [&_h4]:leading-[1.3] [&_h4]:text-[1.1em] [&_h5]:mt-5 [&_h5]:mb-[9px] [&_h5]:leading-[1.3] [&_h5]:text-[1.1em] [&_h6]:mt-5 [&_h6]:mb-[9px] [&_h6]:leading-[1.3] [&_h6]:text-[1.1em] [&_ul]:mb-3.5 [&_ul]:pl-6 [&_ol]:mb-3.5 [&_ol]:pl-6 [&_li+li]:mt-1 [&_blockquote]:my-3.5 [&_blockquote]:border-l-[3px] [&_blockquote]:border-[#b43c42] [&_blockquote]:bg-[rgb(180_60_66/7%)] [&_blockquote]:px-3.5 [&_blockquote]:py-2 [&_blockquote_p:last-child]:mb-0 [&_a]:text-[#a32d35] [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-[#ff9298] [&_pre]:my-3.5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[#f0f1f4] [&_pre]:p-3.5 dark:[&_pre]:bg-[#12131a] [&_code]:rounded [&_code]:bg-[rgb(35_40_55/8%)] [&_code]:px-[5px] [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] dark:[&_code]:bg-[rgb(255_255_255/10%)] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_hr]:my-[18px] [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-solid [&_hr]:border-[rgb(35_40_55/14%)] dark:[&_hr]:border-[rgb(255_255_255/15%)]"
    >
      {blocks}
    </div>
  );
}
