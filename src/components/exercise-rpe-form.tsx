"use client";

import { useRef } from "react";
import { completeExerciseSetAction } from "@/app/actions";

type ExerciseRpeFormProps = {
  exerciseId: string;
  defaultValue: string;
};

export function ExerciseRpeForm({ exerciseId, defaultValue }: ExerciseRpeFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmittedValueRef = useRef(defaultValue);

  const handleBlur = () => {
    const input = inputRef.current;

    if (!input || !input.value || !input.checkValidity()) {
      return;
    }

    if (input.value === lastSubmittedValueRef.current) {
      return;
    }

    lastSubmittedValueRef.current = input.value;
    formRef.current?.requestSubmit();
  };

  return (
    <form action={completeExerciseSetAction} className="exercise-inline-form" ref={formRef}>
      <input name="exerciseId" type="hidden" value={exerciseId} />
      <input
        className="mini-input"
        defaultValue={defaultValue}
        max={10}
        min={6}
        name="actualRpe"
        onBlur={handleBlur}
        ref={inputRef}
        step="0.5"
        type="number"
      />
      <button className="mini-check sr-only" tabIndex={-1} type="submit">
        Save
      </button>
    </form>
  );
}

