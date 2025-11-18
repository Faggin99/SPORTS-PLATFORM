import { cache } from './cache';

// Clear cache on page load during development
if (import.meta.env.DEV) {
  cache.clear();
  console.log('Cache cleared');
}

export { cache };
