export const createCacheKeyForSolutions = (slug: string) => `challenge-${slug}-solutions`;
export const createCacheKeyForSharedSolutionsTab = (userId: string) => `${userId}-shared-solutions`;
