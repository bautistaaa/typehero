'use client';
import { useSession } from '@repo/auth/react';
import { CodePanel } from '@repo/monaco';
import { track as vercelTrack } from '@vercel/analytics';
import { useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { EditorShortcutsButton } from '../_components/editor-shortcuts/editor-shortcuts-button';
import { FullscreenButton } from '../../../components/fullscreen-button';
import { ResetEditorButton } from '../_components/reset-editor-button';
import { SettingsButton } from '../_components/settings/settings-button';
import type { ChallengeRouteData } from './getChallengeRouteData';
import { SubmissionOverview } from './submissions/[[...catchAll]]/_components/overview';
import { saveSubmission } from './submissions/[[...catchAll]]/save-submission.action';
import { fillInMissingBadges } from '~/app/actions/badges/_actions';

interface Props {
  challenge: ChallengeRouteData['challenge'];
  track: ChallengeRouteData['track'];
}

export function RightWrapper({ track, challenge }: Props) {
  const router = useRouter();
  const segments = useSelectedLayoutSegments();
  const { data: session } = useSession();

  if (!challenge) return null;

  if (segments[0] === 'submissions' && typeof segments[1] === 'string') {
    return <SubmissionOverview submissionId={segments[1]} />;
  }

  // Redirect to solution on successful submission and show suggestions
  async function handleSuccessfulSubmission(
    isSuccessful: boolean,
    submissionId: number,
    slug?: string,
  ) {
    const query = slug ? `&slug=${slug}` : '';

    isSuccessful &&
      router.push(`/challenge/${challenge.slug}/submissions/${submissionId}?success=true${query}`);
    isSuccessful && session?.user?.id && (await fillInMissingBadges(session.user.id));
  }

  return (
    <CodePanel
      challenge={challenge}
      saveSubmission={async (code, isSuccessful) => {
        vercelTrack?.('challenge-submitted', {
          success: !isSuccessful,
        });

        const submission = await saveSubmission({
          challenge,
          code,
          isSuccessful,
        });

        return handleSuccessfulSubmission(submission.isSuccessful, submission.id, track?.slug);
      }}
      submissionDisabled={!session?.user}
      settingsElement={<SettingsElements />}
    />
  );
}

function SettingsElements() {
  return (
    <>
      <ResetEditorButton />
      <EditorShortcutsButton />
      <SettingsButton />
      <FullscreenButton />
    </>
  );
}
