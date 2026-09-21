import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, LoaderCircle, X } from "lucide-react";

export type SubmissionStatus = "idle" | "submitting" | "success" | "error";

interface SubmissionStatusModalProps {
  status: SubmissionStatus;
  kind: "eligibility" | "contact";
  confirmationSent?: boolean;
  onClose: () => void;
}

export default function SubmissionStatusModal({ status, kind, confirmationSent = false, onClose }: SubmissionStatusModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (status === "idle") return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      if (status === "submitting") dialogRef.current?.focus();
      else actionRef.current?.focus();
    }, 20);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && status !== "submitting") closeRef.current();
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]') ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [status]);

  if (status === "idle") return null;

  const isEligibility = kind === "eligibility";
  const content = status === "submitting"
    ? {
        eyebrow: "Secure submission",
        title: isEligibility ? "Sending your information" : "Sending your message",
        body: "Please keep this window open while we securely save your request.",
      }
    : status === "success"
      ? {
          eyebrow: "Submission complete",
          title: isEligibility ? "Thank you. We received your information." : "Thank you. We received your message.",
          body: confirmationSent
            ? isEligibility
              ? "Our team will review your request and contact you as soon as possible. We sent a confirmation to the email address you provided. Submission does not guarantee insurance coverage or qualification."
              : "Our team will review your question and contact you as soon as possible. We sent a confirmation to the email address you provided."
            : isEligibility
              ? "Our team will review your request and contact you as soon as possible. Your request was saved, but the confirmation email could not be delivered. Submission does not guarantee insurance coverage or qualification."
              : "Our team will review your question and contact you as soon as possible. Your message was saved, but the confirmation email could not be delivered.",
        }
      : {
          eyebrow: "Submission not completed",
          title: isEligibility ? "Your information was not sent" : "Your message was not sent",
          body: "Please close this notice and try again. You can also call our team for help.",
        };

  return createPortal(
    <div className="submission-modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-modal-title"
        aria-describedby="submission-modal-body"
        aria-live={status === "submitting" ? "polite" : "assertive"}
        className="submission-modal-card"
      >
        {status !== "submitting" && (
          <button type="button" className="submission-modal-close" aria-label="Close notification" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        )}

        <div className={`submission-motion submission-motion-${status}`} aria-hidden="true">
          <span className="submission-motion-orbit submission-motion-orbit-one" />
          <span className="submission-motion-orbit submission-motion-orbit-two" />
          <span className="submission-motion-core">
            {status === "submitting" && <LoaderCircle size={38} strokeWidth={2.2} />}
            {status === "success" && <Check size={42} strokeWidth={2.6} />}
            {status === "error" && <AlertCircle size={40} strokeWidth={2.2} />}
          </span>
          {status === "success" && (
            <>
              <span className="submission-motion-ray submission-motion-ray-one" />
              <span className="submission-motion-ray submission-motion-ray-two" />
              <span className="submission-motion-ray submission-motion-ray-three" />
              <span className="submission-motion-ray submission-motion-ray-four" />
            </>
          )}
        </div>

        <p className="submission-modal-eyebrow">{content.eyebrow}</p>
        <h2 id="submission-modal-title" className="submission-modal-title">{content.title}</h2>
        <p id="submission-modal-body" className="submission-modal-body">{content.body}</p>

        {status !== "submitting" && (
          <button ref={actionRef} type="button" className="submission-modal-action" onClick={onClose}>
            {status === "success" ? "Done" : "Return to form"}
          </button>
        )}

        {status === "submitting" && <div className="submission-progress" aria-hidden="true"><span /></div>}
      </section>
    </div>,
    document.body,
  );
}
