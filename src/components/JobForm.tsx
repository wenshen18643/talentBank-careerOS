"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { JobFormState } from "@/app/actions/employer";
import type { Job } from "@/lib/jobs";
import SkillPicker from "@/components/SkillPicker";
import LocationSelect from "@/components/LocationSelect";
import styles from "@/app/employer.module.css";

/**
 * Create / edit form for a job listing. Skills are entered as comma-separated
 * text and split server-side. `job` pre-fills the fields in edit mode and
 * carries the id through a hidden input.
 */
export default function JobForm({
  action,
  job,
  submitLabel,
}: {
  action: (state: JobFormState, form_data: FormData) => Promise<JobFormState>;
  job?: Job;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<JobFormState, FormData>(action, {
    error: null,
    saved: false,
  });

  return (
    <form action={formAction} className={styles.form} noValidate>
      {job ? <input type="hidden" name="job_id" value={job.id} /> : null}

      {state.error ? (
        <p className="error-text" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className={styles.replyState} role="status">
          ◆ Changes saved.
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="title">Role title</label>
        <input
          id="title"
          name="title"
          className="input"
          required
          defaultValue={job?.title}
          placeholder="Staff Engineer, Payments"
        />
      </div>

      <div className="field">
        <label htmlFor="description">What the role is</label>
        <textarea
          id="description"
          name="description"
          className="textarea"
          defaultValue={job?.description}
          placeholder="The problem this person owns, the team, the stage you're at."
        />
      </div>

      <div className="field">
        <label htmlFor="location">Location</label>
        <LocationSelect name="location" defaultValue={job?.location} />
      </div>

      <div className="field">
        <SkillPicker
          name="required_skills"
          legend="Required skills"
          selected={job?.required_skills}
        />
        <span className={styles.hint}>
          A candidate must have at least one of these on their profile to surface.
        </span>
      </div>

      <div className="field">
        <SkillPicker name="nice_skills" legend="Nice-to-have skills" selected={job?.nice_skills} />
      </div>

      <div className="field">
        <label htmlFor="criteria">Trajectory you&apos;re hiring for</label>
        <textarea
          id="criteria"
          name="criteria"
          className="textarea"
          defaultValue={job?.criteria}
          placeholder="Where this person is heading — e.g. 'someone moving from senior into staff-level ownership of reliability', not just their last title."
        />
        <span className={styles.hint}>
          This is what makes matching forward-looking. The engine weighs it alongside skills.
        </span>
      </div>

      <div className={styles.formActions}>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}
