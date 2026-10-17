export function Stepper({
  value,
  onChange,
  min = 1,
  max = 20,
  step = 1,
  label,
  format = (v: number) => String(v),
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  format?: (v: number) => string;
}) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} aria-label="Меньше">
        −
      </button>
      <output aria-live="polite">{format(value)}</output>
      <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} aria-label="Больше">
        +
      </button>
    </div>
  );
}
