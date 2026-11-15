export const activities = [
  ['meals', 'Kenyan meals and cultural gatherings'],
  ['games', 'Game nights'],
  ['cookouts', 'Cookouts'],
  ['outings', 'Road trips and outings'],
  ['friends', 'Meeting new friends'],
];
export const consentText = 'I agree that 254 Mass Connect may contact me using the details I provide about community activities and gatherings.';
export const successMessage = "Thank you for reaching out! We're glad you're interested in 254 Mass Connect. Your details have been received, and we look forward to connecting with you.";
const allowed = new Set(['fullName', 'email', 'phone', 'city', 'activities', 'message', 'consent', 'website', 'submissionId']);
export function validateJoin(input) {
  const errors = {};
  const value = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { errors: { form: 'Please submit a valid form.' }, value };
  if (Object.keys(input).some(key => !allowed.has(key))) errors.form = 'The form contains unsupported fields.';
  for (const [key, max] of Object.entries({ fullName: 100, email: 254, phone: 40, city: 100, message: 1000, website: 200 })) {
    const raw = input[key] ?? '';
    if (typeof raw !== 'string' || raw.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(raw)) {
      errors[key] = `Please use text of no more than ${max} characters.`; value[key] = ''; continue;
    }
    value[key] = raw.trim();
  }
  value.fullName = value.fullName.replace(/\s+/g, ' ');
  if (!errors.fullName && value.fullName.length < 2) errors.fullName = 'Please enter your full name (2–100 characters).';
  value.email = value.email.toLowerCase();
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) errors.email = 'Please enter a valid email address.';
  if (value.phone) {
    const digits = value.phone.replace(/\D/g, '');
    if (!/^\+?[\d\s().-]+$/.test(value.phone) || digits.length < 7 || digits.length > 15) errors.phone = 'Use 7–15 digits, with an optional country code, such as +254 or +1.';
    else value.phone = `${value.phone.startsWith('+') ? '+' : ''}${digits}`;
  }
  if (!value.email && !value.phone) errors.contact = 'Please provide an email address or phone number so we can contact you.';
  if (!Array.isArray(input.activities ?? []) || (input.activities ?? []).length > activities.length || (input.activities ?? []).some(id => !activities.some(([key]) => key === id))) errors.activities = 'Please choose activities from the list.';
  else value.activities = [...new Set(input.activities ?? [])];
  if (input.consent !== true) errors.consent = 'Please agree to be contacted before sending your interest.';
  value.consent = input.consent === true;
  if (typeof input.submissionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.submissionId)) errors.form = 'Please refresh the page and try again.';
  value.submissionId = input.submissionId;
  return { value, errors };
}
