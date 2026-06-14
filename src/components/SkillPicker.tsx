"use client";

import { useEffect, useId, useRef, useState } from "react";
import { skills } from "@/lib/taxonomy";
import styles from "@/components/pickers.module.css";

/**
 * Searchable multi-select skill picker bound to the controlled skills vocabulary.
 * Selected skills render as removable chips; the dropdown filters as you type.
 * Each selected value is mirrored to a hidden input so the parent <form> submits
 * them under `name`.
 */
export default function SkillPicker({
  name,
  legend,
  selected = [],
}: {
  name: string;
  legend: string;
  selected?: string[];
}) {
  const listId = useId();
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedSkills, setSelectedSkills] = useState<string[]>(selected);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const normalise = (s: string) => s.trim().toLowerCase();

  const available = skills.filter(
    (skill) =>
      !selectedSkills.some((s) => normalise(s) === normalise(skill)) &&
      (query === "" || normalise(skill).includes(normalise(query))),
  );

  const addSkill = (skill: string) => {
    const canonical = skills.find((s) => normalise(s) === normalise(skill));
    if (!canonical) return;
    setSelectedSkills((prev) =>
      prev.some((s) => normalise(s) === normalise(canonical)) ? prev : [...prev, canonical],
    );
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills((prev) => prev.filter((s) => normalise(s) !== normalise(skill)));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && available.length > 0 && event.key !== "Escape") {
      setIsOpen(true);
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, available.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        event.preventDefault();
        if (available[activeIndex]) {
          addSkill(available[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
      case "Backspace":
        if (query === "" && selectedSkills.length > 0) {
          removeSkill(selectedSkills[selectedSkills.length - 1]);
        }
        break;
    }
  };

  useEffect(() => {
    const active = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>

      <div ref={containerRef} className={styles.picker}>
        <div className={styles.tags}>
          {selectedSkills.map((skill) => (
            <span key={skill} className={styles.tag}>
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                aria-label={`Remove ${skill}`}
                className={styles.tagRemove}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className={styles.inputWrap}>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className={`input ${styles.searchInput}`}
            placeholder="Search skills…"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
          />
          <span className={styles.chevron} aria-hidden="true">
            ▼
          </span>
        </div>

        {isOpen && (
          <ul
            ref={listRef}
            id={listId}
            className={styles.dropdown}
            role="listbox"
            aria-label={legend}
          >
            {available.length === 0 ? (
              <li className={styles.empty}>No matching skills</li>
            ) : (
              available.map((skill, index) => (
                <li
                  key={skill}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`${styles.option} ${index === activeIndex ? styles.optionActive : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addSkill(skill);
                  }}
                >
                  {skill}
                </li>
              ))
            )}
          </ul>
        )}

        {selectedSkills.map((skill) => (
          <input key={skill} type="hidden" name={name} value={skill} />
        ))}
      </div>
    </fieldset>
  );
}
