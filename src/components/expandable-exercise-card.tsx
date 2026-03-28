"use client";

import { useId, useState } from "react";

type ExpandableExerciseCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function ExpandableExerciseCard({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: ExpandableExerciseCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className={`exercise-group-card exercise-card-tab ${isOpen ? "open" : ""}`.trim()}>
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className="exercise-card-toggle"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <p className="exercise-group-title">{title}</p>
        {subtitle ? <p className="exercise-card-subtitle">{subtitle}</p> : null}
      </button>

      <div aria-hidden={!isOpen} className="exercise-card-body-shell" id={contentId}>
        <div className="exercise-card-body">
          <div className="exercise-card-controls">
            <p className="exercise-group-title">{title}</p>
            <button className="secondary-button" onClick={() => setIsOpen(false)} type="button">
              Close
            </button>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

