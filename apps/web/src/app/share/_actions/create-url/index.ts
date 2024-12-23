'use server';

import { prisma } from '@repo/db';
import { headers } from 'next/headers';
import { getBaseUrl } from '~/utils/getBaseUrl';
import { rateLimit } from '~/utils/rateLimit';
import { THREE_MONTHS } from '../increment-time';
import { newShortURLSlug } from '../shortUrlSlug';

interface CreateShortURLConfig {
  forceNewUrl?: boolean;
  expiresAt?: Date;
}

export async function createShortURL(
  url: string,
  config = {} as CreateShortURLConfig,
): Promise<string | null> {
  // Rate limit the creation of new short URLs
  const ip = (await headers()).get('x-forwarded-for') ?? 'unknown';
  const isRateLimited = rateLimit(ip);
  if (isRateLimited) {
    console.error('Rate limited:', ip);
    return null;
  }

  const baseURL = getBaseUrl();
  const slug = newShortURLSlug();

  if (!config.forceNewUrl) {
    // check if the long url already exists
    const existing = await prisma.shortURL.findFirst({
      where: {
        originalUrl: url,
      },
    });

    if (existing) {
      return `${baseURL}/share/${existing.shortUrlSlug}`;
    }
  }

  await prisma.shortURL.create({
    data: {
      shortUrlSlug: slug,
      originalUrl: url,
      expiresAt: config.expiresAt ?? new Date(Date.now() + THREE_MONTHS),
    },
  });

  const newURL = `${baseURL}/share/${slug}`;
  return newURL;
}
