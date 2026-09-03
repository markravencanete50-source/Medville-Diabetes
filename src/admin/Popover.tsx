import { useEffect, useRef, type ReactNode, type RefObject } from "react";

/*
  A small panel that opens under a control, for the colour and font pickers.

  On a desktop it hangs below the button that opened it. On a phone it rises
  as a sheet from the foot of the screen behind a scrim, because a panel
  hanging off a button halfway down a form is unreachable by thumb.

  Escape closes it and hands focus back to the button. The key press is
  stopped there rather than bubbling on: the editor drawer around it also
  listens for Escape, and one press should close one thing.
*/
export function Popover({
  open,
  onClose,
  anchor,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchor: RefObject<HTMLElement | null>;
  label: string;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  /* A press anywhere outside the panel and its button closes it. */
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || anchor.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, onClose, anchor]);

  if (!open) return null;

  return (
    <>
      <div className="admin-popover-scrim" aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-label={label}
        className="admin-popover"
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.stopPropagation();
          anchor.current?.focus();
          onClose();
        }}
      >
        {children}
      </div>
    </>
  );
}
