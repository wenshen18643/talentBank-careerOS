import { malaysia_locations } from "@/lib/taxonomy";

/**
 * Location dropdown bound to the Malaysia-only location vocabulary (states and
 * federal territories). Used by the candidate profile and the employer job form.
 */
export default function LocationSelect({
  name,
  defaultValue,
  allowEmpty = true,
}: {
  name: string;
  defaultValue?: string | null;
  allowEmpty?: boolean;
}) {
  return (
    <select name={name} className="select" defaultValue={defaultValue ?? ""}>
      {allowEmpty ? <option value="">Select a location…</option> : null}
      {malaysia_locations.map((location) => (
        <option key={location} value={location}>
          {location}
        </option>
      ))}
    </select>
  );
}
