export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '')          // Trim - from end of text
    .substring(0, 60);           // Limit to 60 chars
}

export function handle301Redirects(path: string): string | null {
  const redirects: { [key: string]: string } = {
    // Add known bad slugs here to redirect to new good slugs
    // Example:
    // '/game/sins-of-jinn\'s-': '/game/sins-of-jinn',
    // '/blog/how-lockout-escape-room-works:-can-you-escape-in-60-minutes?': '/blog/how-lockout-escape-room-works',
  };

  // Check for exact match
  if (redirects[path]) {
    return redirects[path];
  }

  // Check for dynamic routes with bad slugs
  // This is a more general catch-all for cleaning up URLs on the fly if needed
  // or specific patterns
  
  return null;
}
