import { prisma } from '@repo/db';
import type { Stripe } from 'stripe';
import { auth } from '~/server/auth';
import { stripe } from '../_utils/stripe';
import Content from './content';

export default async function ResultPage({
  searchParams: searchParamsData,
}: {
  searchParams: Promise<{ checkout_id: string }>;
}) {
  const searchParams = await searchParamsData;

  if (!searchParams.checkout_id || !searchParams)
    throw new Error('Please provide a valid session_id (`cs_test_...`)');

  const session = await auth();

  const checkoutSession: Stripe.Checkout.Session = await stripe.checkout.sessions.retrieve(
    searchParams.checkout_id,
    {
      expand: ['line_items', 'payment_intent'],
    },
  );

  const paymentIntent = checkoutSession.payment_intent as Stripe.PaymentIntent;

  if (
    session &&
    paymentIntent.status === 'succeeded' &&
    checkoutSession.amount_total &&
    checkoutSession.amount_total > 0
  ) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        donations: {
          upsert: {
            where: { stripeCheckoutSessionId: checkoutSession.id },
            update: {},
            create: {
              stripeCheckoutSessionId: checkoutSession.id,
              amount: checkoutSession.amount_total,
            },
          },
        },
        roles: {
          connectOrCreate: {
            where: {
              role: 'SUPPORTER',
            },
            create: {
              role: 'SUPPORTER',
            },
          },
        },
      },
    });
  }

  if (paymentIntent.status !== 'succeeded') {
    return (
      <div className="container flex h-full flex-col items-center justify-center p-4">
        <h1 className="mb-8 text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Something went wrong.
        </h1>
      </div>
    );
  }

  return <Content />;
}
