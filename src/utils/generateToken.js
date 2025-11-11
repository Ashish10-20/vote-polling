export const validateOptions = (options = []) => {
  if (!Array.isArray(options) || options.length < 2) {
    return 'Provide at least two options';
  }
  const trimmed = options.map((o) => (typeof o === 'string' ? o.trim() : ''));
  if (trimmed.some((t) => !t)) return 'Options cannot be empty';
  const set = new Set(trimmed.map((t) => t.toLowerCase()));
  if (set.size !== trimmed.length) return 'Duplicate options are not allowed';
  return null;
};

export const isPast = (date) => new Date(date).getTime() <= Date.now();
