"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfileAction, type ProfileState } from "@/app/actions/candidate";
import type { SessionUser } from "@/lib/auth";
import SkillPicker from "@/components/SkillPicker";
import LocationSelect from "@/components/LocationSelect";
import styles from "@/app/employer.module.css";

/**
 * Candidate profile editor. Headline is free text; location and skills are bound
 * to the controlled vocabularies — these skills are the candidate's matching
 * surface, so they must come from the shared list, not free input.
 */
export default function ProfileForm({ user }: { user: SessionUser }) {
  const [state, formAction] = useActionState<ProfileState, FormData>(updateProfileAction, {
    error: null,
    saved: false,
  });

  return (
    <form action={formAction} className={styles.form}>
      {state.error ? (
        <p className="error-text" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className={styles.replyState} role="status">
          ◆ Profile saved — you&apos;re now matchable on these skills.
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="headline">Headline</label>
        <input
          id="headline"
          name="headline"
          className="input"
          defaultValue={user.headline ?? ""}
          placeholder="Senior Engineer focused on payments reliability"
          maxLength={120}
        />
      </div>

      <div className="field">
        <label htmlFor="location">Location</label>
        <LocationSelect name="location" defaultValue={user.location} />
      </div>

      <div className="field">
        <SkillPicker
          key={user.skills.join("|")}
          name="skills"
          legend="Your skills"
          selected={user.skills}
        />
        <span className={styles.hint}>
          Pick the skills you can genuinely demonstrate. Employers match against these.
        </span>
      </div>

      <div className={styles.formActions}>
        <SaveButton />
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Saving…" : "Save profile"}
    </button>
  );
}
