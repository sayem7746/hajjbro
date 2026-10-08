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
}) => {
  return (
    <div className="group relative">
      <label
        htmlFor={id}
        className="mb-1 ml-1 block text-xs font-semibold text-stitch-primary/60 transition-colors group-focus-within:text-stitch-primary"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border-0 border-b-2 border-transparent bg-stitch-surface-low px-4 py-4 font-sans text-base text-stitch-on-surface outline-none transition-all duration-300 placeholder:text-stitch-on-variant/40 focus:border-stitch-primary"
      />
      {trailing}
    </div>
  );
};

export default InscribedField;
