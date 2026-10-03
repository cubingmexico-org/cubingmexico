import type { MentionOptions } from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type GetReferenceClientRect, type Instance } from "tippy.js";
import {
  MentionList,
  type MentionListProps,
  type MentionListRef,
} from "../mention-list";

export function createSuggestion(
  items: string[],
): MentionOptions<string>["suggestion"] {
  return {
    items: ({ query }) =>
      items.filter((item) =>
        item.toLowerCase().startsWith(query.toLowerCase()),
      ),

    render: () => {
      let reactRenderer: ReactRenderer<MentionListRef, MentionListProps>;
      let popup: Instance[];

      return {
        onStart: (props) => {
          if (!props.clientRect) {
            return;
          }

          reactRenderer = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect as GetReferenceClientRect,
            appendTo: () => document.body,
            content: reactRenderer.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },

        onUpdate(props) {
          reactRenderer.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup[0]?.setProps({
            getReferenceClientRect: props.clientRect as GetReferenceClientRect,
          });
        },

        onKeyDown(props) {
          if (props.event.key === "Escape") {
            popup[0]?.hide();

            return true;
          }

          return reactRenderer.ref?.onKeyDown(props) ?? false;
        },

        onExit() {
          popup[0]?.destroy();
          reactRenderer.destroy();
        },
      };
    },
  };
}
