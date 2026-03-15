import * as React from "react";
import { cn } from "@/lib/utils";

let lastFocusedField = null;

const isEditableElement = (element) => {
    if (!element) return false;
    const tagName = element.tagName;
    return (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        element.isContentEditable
    );
};

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

const getSelection = (element) => {
    try {
        return {
            start: element.selectionStart,
            end: element.selectionEnd,
        };
    } catch {
        return { start: null, end: null };
    }
};

const restoreSelection = (element, selection) => {
    if (!selection || selection.start == null || selection.end == null) return;
    try {
        element.setSelectionRange(selection.start, selection.end);
    } catch {
        // Some input types, like date/number, do not support text selection.
    }
};

const Input = React.forwardRef(({ className, type, onBlur, onChange, onFocus, onKeyUp, onMouseUp, onSelect, ...props }, ref) => {
    const fallbackId = React.useId();
    const inputRef = React.useRef(null);
    const focusKey = String(props.id || props.name || props.placeholder || props["aria-label"] || fallbackId);

    const rememberFocus = React.useCallback((element) => {
        lastFocusedField = {
            key: focusKey,
            selection: getSelection(element),
        };
    }, [focusKey]);

    React.useLayoutEffect(() => {
        const element = inputRef.current;
        if (!element || lastFocusedField?.key !== focusKey) return;

        const activeElement = document.activeElement;
        const focusMovedToAnotherField =
            activeElement &&
            activeElement !== document.body &&
            activeElement !== element &&
            isEditableElement(activeElement);

        if (focusMovedToAnotherField) return;

        if (activeElement !== element) {
            element.focus({ preventScroll: true });
        }
        restoreSelection(element, lastFocusedField.selection);
    });

    return (
        <input
            type={type}
            data-invigo-focus-key={focusKey}
            className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className)}
            ref={(node) => setRefs(node, inputRef, ref)}
            onFocus={(event) => {
                rememberFocus(event.currentTarget);
                onFocus?.(event);
            }}
            onBlur={(event) => {
                onBlur?.(event);
                const nextFocused = event.relatedTarget;
                if (nextFocused && nextFocused !== event.currentTarget) {
                    lastFocusedField = lastFocusedField?.key === focusKey ? null : lastFocusedField;
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
Input.displayName = "Input";
export { Input };
