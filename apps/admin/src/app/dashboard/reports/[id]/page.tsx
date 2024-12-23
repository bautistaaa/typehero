import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import { Markdown } from '@repo/ui/components/markdown';
import { Text } from '@repo/ui/components/typography/typography';
import { AlertCircle, ChevronLeft } from '@repo/ui/icons';
import Link from 'next/link';
import { auth } from '~/server/auth';
import { assertAdmin } from '~/utils/auth-guards';
import { getReport, type ReportWithInfo } from './_actions';
import { ChallengeReport } from './_components/challenge.report';
import { CommentReport } from './_components/comment.report';
import { SolutionReport } from './_components/solution.report';
import { UserReport } from './_components/user.report';
import { ReportActions } from './actions';

type Params = Promise<{ id: string }>;

const getTitle = (type: string) => {
  switch (type) {
    case 'USER':
      return 'User Report';
    case 'CHALLENGE':
      return 'Challenge Report';
    case 'COMMENT':
      return 'Comment Report';
    case 'SOLUTION':
      return 'Solution Report';
  }
};

const getComponentByType = (type: ReportWithInfo['type']) => {
  return {
    CHALLENGE: ChallengeReport,
    COMMENT: CommentReport,
    SOLUTION: SolutionReport,
    USER: UserReport,
  }[type];
};

export default async function ({ params }: { params: Params }) {
  const { id } = await params;
  const session = await auth();
  assertAdmin(session);

  const report = await getReport(Number(id));

  const ReportComponent = getComponentByType(report.type);

  return (
    <div className="container  ">
      <Link className="inline-flex gap-2" href="/">
        {' '}
        <ChevronLeft /> <span>Back to reports</span>
      </Link>
      <div className="bg-background/80 sticky top-0 z-50 flex items-center justify-between">
        <Text color="primary" intent="h1">
          {getTitle(report.type)}
        </Text>
        <ReportActions report={report} />
      </div>

      {report.moderator ? (
        <Alert className="mt-4" variant="destructive">
          <div className="mb-0.5 flex items-center gap-2">
            <AlertCircle className="h-[1.25rem]" />
            <AlertTitle className="mb-0">Action already taken</AlertTitle>
          </div>

          <AlertDescription>
            Moderator @{report.moderator.name} took action on this case already.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="wrapper mt-4 flex flex-col gap-4 md:flex-row">
        <section className="order-2 flex-grow md:order-1">
          <ReportComponent report={report} />
        </section>
        <aside className="order-1 flex-shrink-0 md:order-2 md:w-1/3 lg:w-[30%]">
          <Text className="mt-6" intent="h2">
            Information
          </Text>

          <Text className="mt-4" intent="leading">
            Reporter{' '}
            <Link className="text-gray-400 hover:underline" href={`/@${report.reporter.name}`}>
              @{report.reporter.name}
            </Link>{' '}
            says that this challenge includes:{' '}
          </Text>

          <ul className="list-disc pl-8">
            {report.issues.map((issue) => (
              <li key={`issue-${issue.id}`}>{issue.type}</li>
            ))}
          </ul>

          <section className="my-4">
            <Text weight="semi">Other comments by reporter</Text>
            <div className="mt-4 rounded-lg bg-zinc-200 p-4 text-gray-800 dark:bg-zinc-800 dark:text-white">
              <Markdown>{report.text || '_No additional comments given_'}</Markdown>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
