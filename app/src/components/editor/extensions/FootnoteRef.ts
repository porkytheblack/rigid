/**
 * TipTap extension for footnote references.
 * Renders as [^id] in the editor and stores the footnote identifier.
 */

import { Mark, mergeAttributes } from "@tiptap/core";

export interface FootnoteRefOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    footnoteRef: {
      /**
       * Set a footnote reference mark
       */
      setFootnoteRef: (attributes: { footnoteId: string }) => ReturnType;
      /**
       * Toggle a footnote reference mark
       */
      toggleFootnoteRef: (attributes: { footnoteId: string }) => ReturnType;
      /**
       * Unset a footnote reference mark
       */
      unsetFootnoteRef: () => ReturnType;
    };
  }
}

export const FootnoteRef = Mark.create<FootnoteRefOptions>({
  name: "footnoteRef",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      footnoteId: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-footnote-id"),
        renderHTML: (attributes) => {
          if (!attributes.footnoteId) {
            return {};
          }
          return {
            "data-footnote-id": attributes.footnoteId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "sup[data-footnote-ref]",
      },
      {
        tag: 'a[href^="#fn-"]',
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          const href = element.getAttribute("href") || "";
          const match = href.match(/^#fn-(.+)$/);
          if (match) {
            return { footnoteId: match[1] };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "sup",
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          "data-footnote-ref": "",
          class: "footnote-ref text-[var(--accent-interactive)] cursor-pointer hover:underline",
        }
      ),
      ["a", { href: `#fn-${HTMLAttributes["data-footnote-id"]}` }, `[${HTMLAttributes["data-footnote-id"]}]`],
    ];
  },

  addCommands() {
    return {
      setFootnoteRef:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleFootnoteRef:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetFootnoteRef:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

export default FootnoteRef;
