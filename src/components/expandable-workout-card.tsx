"use client";

import { useId, useState } from "react";

type ExpandableWorkoutCardProps = {
  title: string;
  status: string;
  description?: string;
  deadline: string;
  group: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function ExpandableWorkoutCard({
  title,
  status,
  description,
  deadline,
  group,
  children,
  defaultOpen = false,
}: ExpandableWorkoutCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const hasDescription = Boolean(description?.trim());

  return (
    <article className={`workout-card workout-card-tab ${isOpen ? "open" : ""}`.trim()}>
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className="workout-card-toggle"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <div className="workout-card-summary">
          <div className="workout-card-summary-main">
            <h2 className="workout-title">{title}</h2>
            {hasDescription ? <p className="workout-card-description">{description}</p> : null}
          </div>

          <div className="workout-card-summary-side">
            <span className="workout-status">{status}</span>
            <p className="workout-card-deadline">{deadline}</p>
          </div>
        </div>

        <div className="workout-card-meta">
          <span className="workout-card-group-label">Group</span>
          <span className="workout-card-group-value">{group}</span>
        </div>
      </button>

      <div
        aria-hidden={!isOpen}
        className="workout-card-body-shell"
        id={contentId}
      >
        <div className="workout-card-body">
          <div className="workout-card-controls">
            <span className="workout-status">{status}</span>
            <button className="secondary-button" onClick={() => setIsOpen(false)} type="button">
              Close
            </button>
          </div>
          {children}
        </div>
      </div>
    </article>
  );
}

