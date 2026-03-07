"use client";

import { useState } from "react";
import { createWorkoutAction } from "@/app/actions";

type TraineeOption = {
  id: string;
  name: string;
};

type SetRow = {
  id: string;
  reps: string;
  load: string;
  targetRpe: string;
  optionalIntensity: string;
};

type ExerciseBlock = {
  id: string;
  name: string;
  sets: string;
  rows: SetRow[];
};

type WorkoutPlanFormProps = {
  groupId: string;
  trainees: TraineeOption[];
};

function createSetRow(seed: number): SetRow {
  return {
    id: `set-${seed}`,
    reps: "8",
    load: "60",
    targetRpe: "8",
    optionalIntensity: "",
  };
}

function createExerciseBlock(seed: number): ExerciseBlock {
  return {
    id: `exercise-${seed}`,
    name: "",
    sets: "3",
    rows: [createSetRow(seed * 100 + 1), createSetRow(seed * 100 + 2), createSetRow(seed * 100 + 3)],
  };
}

function syncRowsCount(rows: SetRow[], setsCount: number, seedBase: number) {
  if (setsCount <= 0) {
    return rows;
  }

  if (rows.length === setsCount) {
    return rows;
  }

  if (rows.length > setsCount) {
    return rows.slice(0, setsCount);
  }

  const next = [...rows];
  for (let i = rows.length; i < setsCount; i += 1) {
    next.push(createSetRow(seedBase + i + 1));
  }

  return next;
}

export function WorkoutPlanForm({ groupId, trainees }: WorkoutPlanFormProps) {
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([createExerciseBlock(1)]);

  const addExercise = () => {
    setBlocks((current) => [...current, createExerciseBlock(current.length + 1)]);
  };

  const removeExercise = (id: string) => {
    setBlocks((current) => (current.length > 1 ? current.filter((block) => block.id !== id) : current));
  };

  const updateBlockName = (id: string, name: string) => {
    setBlocks((current) => current.map((block) => (block.id === id ? { ...block, name } : block)));
  };

  const updateBlockSets = (id: string, sets: string) => {
    setBlocks((current) =>
      current.map((block, index) => {
        if (block.id !== id) {
          return block;
        }

        const parsed = Number.parseInt(sets, 10);
        const safeSets = Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;

        return {
          ...block,
          sets: String(safeSets),
          rows: syncRowsCount(block.rows, safeSets, (index + 1) * 1000),
        };
      }),
    );
  };

  const updateRow = (blockId: string, rowId: string, key: keyof SetRow, value: string) => {
    setBlocks((current) =>
      current.map((block) => {
        if (block.id !== blockId) {
          return block;
        }

        return {
          ...block,
          rows: block.rows.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)),
        };
      }),
    );
  };

  if (!trainees.length) {
    return <p className="panel-copy">No trainees in this group yet.</p>;
  }

  return (
    <form action={createWorkoutAction} className="form-stack">
      <input name="groupId" type="hidden" value={groupId} />

      <label className="field-label" htmlFor={`trainee-${groupId}`}>
        Trainee
      </label>
      <select
        className="field-input select-input"
        defaultValue={trainees[0]?.id ?? ""}
        id={`trainee-${groupId}`}
        name="traineeId"
        required
      >
        {trainees.map((trainee) => (
          <option key={trainee.id} value={trainee.id}>
            {trainee.name}
          </option>
        ))}
      </select>

      <div className="plan-grid-two">
        <div>
          <label className="field-label" htmlFor={`title-${groupId}`}>
            Workout Title
          </label>
          <input className="field-input" id={`title-${groupId}`} name="title" placeholder="Push Day" required type="text" />
        </div>

        <div>
          <label className="field-label" htmlFor={`day-${groupId}`}>
            Day Label
          </label>
          <input className="field-input" id={`day-${groupId}`} name="dayLabel" placeholder="Monday" required type="text" />
        </div>
      </div>

      <label className="field-label" htmlFor={`deadline-${groupId}`}>
        Deadline
      </label>
      <input className="field-input date-input" id={`deadline-${groupId}`} name="deadline" required type="date" />

      <div className="sub-block">
        <p className="field-label">Exercise Plan</p>

        <div className="exercise-form-list">
          {blocks.map((block) => (
            <div className="exercise-form-card" key={block.id}>
              <div className="exercise-top-row">
                <div>
                  <label className="field-label" htmlFor={`${block.id}-name`}>
                    Exercise
                  </label>
                  <input
                    className="field-input"
                    id={`${block.id}-name`}
                    onChange={(event) => updateBlockName(block.id, event.target.value)}
                    placeholder="Bench Press"
                    required
                    value={block.name}
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor={`${block.id}-sets`}>
                    Sets
                  </label>
                  <input
                    className="field-input"
                    id={`${block.id}-sets`}
                    min={1}
                    onChange={(event) => updateBlockSets(block.id, event.target.value)}
                    required
                    type="number"
                    value={block.sets}
                  />
                </div>

                <button className="secondary-button mt-auto" onClick={() => removeExercise(block.id)} type="button">
                  Remove
                </button>
              </div>

              <div className="set-grid-head" aria-hidden="true">
                <span>Name</span>
                <span>Set</span>
                <span>Reps</span>
                <span>Load</span>
                <span>Target RPE</span>
                <span>Optional Intensity %</span>
              </div>

              {block.rows.map((row, idx) => (
                <div className="set-grid-row" key={row.id}>
                  <input name="exerciseName" type="hidden" value={block.name} />
                  <input name="exerciseSets" type="hidden" value={block.sets} />
                  <input name="exerciseSetNumber" type="hidden" value={String(idx + 1)} />

                  <div className="set-grid-static">{block.name || "Exercise name"}</div>
                  <div className="set-grid-static">
                    {idx + 1}/{block.sets}
                  </div>

                  <input
                    className="field-input"
                    min={1}
                    name="exerciseReps"
                    onChange={(event) => updateRow(block.id, row.id, "reps", event.target.value)}
                    required
                    type="number"
                    value={row.reps}
                  />
                  <input
                    className="field-input"
                    min={0.5}
                    name="exerciseLoad"
                    onChange={(event) => updateRow(block.id, row.id, "load", event.target.value)}
                    required
                    step="0.5"
                    type="number"
                    value={row.load}
                  />
                  <input
                    className="field-input"
                    max={10}
                    min={6}
                    name="exerciseTargetRpe"
                    onChange={(event) => updateRow(block.id, row.id, "targetRpe", event.target.value)}
                    required
                    step="0.5"
                    type="number"
                    value={row.targetRpe}
                  />
                  <input
                    className="field-input"
                    max={100}
                    min={30}
                    name="exerciseOptionalIntensity"
                    onChange={(event) => updateRow(block.id, row.id, "optionalIntensity", event.target.value)}
                    step="0.1"
                    type="number"
                    value={row.optionalIntensity}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <button className="secondary-button" onClick={addExercise} type="button">
          Add Exercise
        </button>
      </div>

      <button className="primary-button" type="submit">
        Assign Workout
      </button>
    </form>
  );
}
