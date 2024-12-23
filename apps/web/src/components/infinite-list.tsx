import type { ReactNode, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

interface InfiniteListProps {
  children: ReactNode;
  isLoadingNext: boolean;
  next: () => void;
  hasNext: boolean;
  loader: ReactNode;
}

const ROOT_MARGIN = '200px';

const DEFAULT_OPTIONS = {
  rootMargin: ROOT_MARGIN,
  threshold: 1,
};

export function useObserver(
  ref: RefObject<HTMLDivElement | null>,
  options?: IntersectionObserverInit,
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const observerRef = useRef<IntersectionObserver>(null);

  if (!observerRef.current && typeof IntersectionObserver !== 'undefined') {
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setEntry(entry);
        }
      },
      {
        ...DEFAULT_OPTIONS,
        ...options,
      },
    );
  }

  useEffect(() => {
    const loaderEl = ref.current;
    const observer = observerRef.current;
    if (!loaderEl || !observer) return;

    observer.observe(loaderEl);
    return () => observer.unobserve(loaderEl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current]);

  return entry;
}

export default function InfiniteList({
  children,
  hasNext,
  isLoadingNext,
  next,
  loader,
}: InfiniteListProps) {
  const loaderRef = useRef<HTMLDivElement>(null);
  const entry = useObserver(loaderRef);

  useEffect(() => {
    if (isLoadingNext || !entry?.isIntersecting || !hasNext) return;
    console.log('call nnext');
    next();
  }, [entry?.isIntersecting, isLoadingNext, hasNext, next]);

  return (
    <>
      {children}
      {isLoadingNext ? loader : null}
      {hasNext ? <div ref={loaderRef} /> : null}
    </>
  );
}
