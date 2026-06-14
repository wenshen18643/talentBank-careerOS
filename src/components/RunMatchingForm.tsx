"use client";

import { useFormStatus } from "react-dom";

export default function RunMatchingForm({
  jobId,
  action,
}: {
  jobId: number;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="job_id" value={jobId} />
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? (
        <>
          <Spinner />
          Finding matches…
        </>
      ) : (
        "Find matches"
      )}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: "0.9rem",
        height: "0.9rem",
        border: "2px solid currentColor",
        borderRightColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.75s linear infinite",
      }}
    />
  );
}
