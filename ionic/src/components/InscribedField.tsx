import React from 'react';

type InscribedFieldProps = {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  trailing?: React.ReactNode;
  compact?: boolean;
};

/** Stitch "inscribed" field: warm fill, bottom stroke only while focused. */
const InscribedField: React.FC<InscribedFieldProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  trailing,
  compact = false,
}) => {
  return (
    <div className="group">
      <label
        htmlFor={id}
        className="mb-0.5 ml-1 block text-xs font-semibold text-stitch-primary/60 transition-colors group-focus-within:text-stitch-primary"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg border-0 border-b-2 border-transparent bg-stitch-surface-low px-4 font-sans text-stitch-on-surface outline-none transition-all duration-300 placeholder:text-stitch-on-variant/40 focus:border-stitch-primary ${
            compact ? 'py-2.5 text-[15px]' : 'py-4 text-base'
          }${trailing ? ' pr-11' : ''}`}
        />
        {trailing ? (
          <div className="absolute inset-y-0 right-0 flex w-11 items-center justify-center">
            {trailing}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default InscribedField;
