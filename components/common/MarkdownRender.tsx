import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AnchorHTMLAttributes } from "react";
import { memo } from "react";
import Markdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import CustomLink from "./Link";

const MarkdownAnchor = ({
  href,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) => {
  return href ? (
    <CustomLink href={href} {...props}>
      {children}
    </CustomLink>
  ) : (
    <span>{children}</span>
  );
};

// Create stable components object outside of component to prevent recreation on every render
const markdownComponents = {
  a: MarkdownAnchor,
  hr: Separator,
  table: Table,
  tbody: TableBody,
  thead: TableHeader,
  th: TableHead,
  td: TableCell,
  tr: TableRow,
  tf: TableFooter,
};

interface MarkdownRenderProps {
  content: string;
}

const MarkdownRender = memo(function MarkdownRender({
  content,
}: Readonly<MarkdownRenderProps>) {
  return (
    <Markdown
      components={markdownComponents}
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[[rehypeSanitize, { schema: defaultSchema }]]}
    >
      {content}
    </Markdown>
  );
});

MarkdownRender.displayName = "MarkdownRender";

export default MarkdownRender;
