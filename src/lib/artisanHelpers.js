
/**
 * Transforms a user object containing artisan application data into the standard application format.
 */
export function transformUserToApplication(user) {
  if (!user || !user.artisanApplication) return null;
  
  const application = {
    ...user.artisanApplication,
    _id: user.artisanApplication.applicationId || user._id,
    userId: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    id: user.artisanApplication.applicationId || user._id.toString()
  };

  const arrayFields = ['artisanType', 'specialties', 'services', 'materials', 'techniques'];
  arrayFields.forEach(field => {
    if (application[field] && typeof application[field] === 'string') {
      try {
        application[field] = JSON.parse(application[field]);
      } catch (e) {
        application[field] = application[field].split(',').map(item => item.trim());
      }
    }
  });

  return application;
}

/**
 * Generates a URL-friendly slug based on text.
 */
export function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
