import * as React from "react";
import { cn } from "@/lib/utils";

let lastFocusedTextarea = null;

const setRefs = (node, ...refs) => {
    refs.forEach((currentRef) => {
        if (!currentRef) return;
        if (typeof currentRef === "function") {
            currentRef(node);
        } else {
            currentRef.current = node;
        }
    });
};

const Textarea = React.forwardRef(({ className, onBlur, onChange, onFocus, onKeyUp, onMouseUp, onSelect, ...props }, ref) => {
    const fallbackId = React.useId();
    const textareaRef = React.useRef(null);
    const focusKey = String(props.id || props.name || props.placeholder || props["aria-label"] || fallbackId);

    const rememberFocus = React.useCallback((element) => {
        lastFocusedTextarea = {
            key: focusKey,
            start: element.selectionStart,
            end: element.selectionEnd,
        };
    }, [focusKey]);

    React.useLayoutEffect(() => {
        const element = textareaRef.current;
        if (!element || lastFocusedTextarea?.key !== focusKey) return;

        const activeElement = document.activeElement;
        const focusMovedToAnotherField =
            activeElement &&
            activeElement !== document.body &&
            activeElement !== element &&
            ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);

        if (focusMovedToAnotherField) return;

        if (activeElement !== element) {
            element.focus({ preventScroll: true });
        }
        element.setSelectionRange(lastFocusedTextarea.start, lastFocusedTextarea.end);
    });

    return (
        <textarea
            data-invigo-focus-key={focusKey}
            className={cn("flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)}
            ref={(node) => setRefs(node, textareaRef, ref)}
            onFocus={(event) => {
                rememberFocus(event.currentTarget);
                onFocus?.(event);
            }}
            onBlur={(event) => {
                onBlur?.(event);
                const nextFocused = event.relatedTarget;
                if (nextFocused && nextFocused !== event.currentTarget) {
                    lastFocusedTextarea = lastFocusedTextarea?.key === focusKey ? null : lastFocusedTextarea;
                }
            }}
            onChange={(event) => {
                rememberFocus(event.currentTarget);
                onChange?.(event);
            }}
            onKeyUp={(event) => {
                rememberFocus(event.currentTarget);
                onKeyUp?.(event);
            }}
            onMouseUp={(event) => {
                rememberFocus(event.currentTarget);
                onMouseUp?.(event);
            }}
            onSelect={(event) => {
                rememberFocus(event.currentTarget);
                onSelect?.(event);
            }}
            {...props}
        />
    );
});
Textarea.displayName = "Textarea";
export { Textarea };
