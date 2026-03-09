"use client";

import { useState } from "react";
import { createWorkoutAction, saveWorkoutTemplateAction } from "@/app/actions";

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
  templates: WorkoutTemplateOption[];
};

type WorkoutTemplateExerciseOption = {
  id: string;
  name: string;
  setNumber: number;
  sets: number;
  reps: number;
  rpe: number;
  load: number;
  explicitIntensity: number | null;
  sortOrder: number;
};

type WorkoutTemplateOption = {
  id: string;
  name: string;
  title: string;
  dayLabel: string;
  exercises: WorkoutTemplateExerciseOption[];
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

export function WorkoutPlanForm({ groupId, trainees, templates }: WorkoutPlanFormProps) {
  const [title, setTitle] = useState("");
  const [dayLabel, setDayLabel] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? "");
  const [showTemplates, setShowTemplates] = useState(false);
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

  const applyTemplate = () => {
    const template = templates.find((entry) => entry.id === selectedTemplateId);

    if (!template) {
      return;
    }

    setTitle(template.title);
    setDayLabel(template.dayLabel);

    const grouped = template.exercises.reduce<Array<{
      name: string;
      sets: number;
      rows: WorkoutTemplateExerciseOption[];
    }>>((accumulator, exercise) => {
      const existing = accumulator.find((item) => item.name === exercise.name);

      if (existing) {
        existing.rows.push(exercise);
        return accumulator;
      }

      accumulator.push({
        name: exercise.name,
        sets: exercise.sets,
        rows: [exercise],
      });
      return accumulator;
    }, []);

    const mappedBlocks = grouped.map((group, blockIndex) => {
      const sortedRows = [...group.rows].sort((a, b) => a.sortOrder - b.sortOrder);
      return {
        id: `template-exercise-${blockIndex + 1}`,
        name: group.name,
        sets: String(group.sets),
        rows: sortedRows.map((row, rowIndex) => ({
          id: `template-set-${blockIndex + 1}-${rowIndex + 1}`,
          reps: String(row.reps),
          load: String(row.load),
          targetRpe: String(row.rpe),
          optionalIntensity: row.explicitIntensity === null ? "" : String(row.explicitIntensity),
        })),
      };
    });

    setBlocks(mappedBlocks.length ? mappedBlocks : [createExerciseBlock(1)]);
  };

  if (!trainees.length) {
    return <p className="panel-copy">No trainees in this group yet.</p>;
  }

  return (
    <form action={createWorkoutAction} className="form-stack">
      <input name="groupId" type="hidden" value={groupId} />
      <div className="form-head-row">
        <p className="field-label">Create Workout</p>
        <button className="secondary-button" onClick={() => setShowTemplates((current) => !current)} type="button">
          Templates
        </button>
      </div>

      {showTemplates ? (
        <div className="template-panel">
          <label className="field-label" htmlFor={`template-select-${groupId}`}>
            Saved Templates
          </label>
          <div className="template-row">
            <select
              className="field-input select-input"
              id={`template-select-${groupId}`}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              value={selectedTemplateId}
            >
              {templates.length ? (
                templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))
              ) : (
                <option value="">No templates yet</option>
              )}
            </select>
            <button className="secondary-button" disabled={!templates.length} onClick={applyTemplate} type="button">
              Apply
            </button>
          </div>

          <label className="field-label" htmlFor={`template-name-${groupId}`}>
            Save Current As
          </label>
          <div className="template-row">
            <input
              className="field-input"
              id={`template-name-${groupId}`}
              name="templateName"
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="Upper Body Hypertrophy"
              value={templateName}
            />
            <button className="secondary-button" formAction={saveWorkoutTemplateAction} formNoValidate type="submit">
              Save Template
            </button>
          </div>
        </div>
      ) : null}

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
          <input
            className="field-input"
            id={`title-${groupId}`}
            name="title"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Push Day"
            required
            type="text"
            value={title}
          />
        </div>

        <div>
          <label className="field-label" htmlFor={`day-${groupId}`}>
            Day Label
          </label>
          <input
            className="field-input"
            id={`day-${groupId}`}
            name="dayLabel"
            onChange={(event) => setDayLabel(event.target.value)}
            placeholder="Monday"
            required
            type="text"
            value={dayLabel}
          />
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
