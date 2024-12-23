import type { Metadata } from 'next';
import { Suspense, use } from 'react';
import { ExploreSlug } from '../_components/explore-slug';
import { ExploreSlugSkeleton } from '../_components/explore-slug-skeleton';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export const metadata: Metadata = {
  title: 'Explore Challenges | TypeHero',
};

// accepts both difficulty & tags as slug.
// ex: `/explore/easy`, `explore/popular`
export default function Page({ params }: { params: Params }) {
  const { slug } = use(params);

  return (
    <Suspense fallback={<ExploreSlugSkeleton />}>
      <ExploreSlug slug={slug} />
    </Suspense>
  );
}
