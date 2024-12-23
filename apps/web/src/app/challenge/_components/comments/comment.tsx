'use client';

import { useSession } from '@repo/auth/react';
import { type CommentRoot } from '@repo/db/types';
import { Button } from '@repo/ui/components/button';
import { Markdown } from '@repo/ui/components/markdown';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/tooltip';
import { toast } from '@repo/ui/components/use-toast';
import { UserAvatar } from '@repo/ui/components/user-avatar';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  EllipsisVertical,
  Flag,
  MoreHorizontal,
  Pencil,
  Reply,
  Share,
  Trash2,
} from '@repo/ui/icons';
import clsx from 'clsx';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ReportDialog } from '~/components/ReportDialog';
import { isAdminOrModerator } from '~/utils/auth-guards';
import { getRelativeTimeStrict } from '~/utils/relativeTime';
import type { ChallengeRouteData } from '../../[slug]/getChallengeRouteData';
import type { SolutionRouteData } from '../../[slug]/solutions/[solutionId]/getSolutionIdRouteData';
import { Vote } from '../vote';
import { CommentInput } from './comment-input';
import { CommentSkeleton } from './comment-skeleton';
import { useCommentsReplies, type UseCommentRepliesProps } from './comments.hooks';
import { CommentDeleteDialog } from './delete';
import { UserBadge } from './enhanced-user-badge';
import { type PaginatedComments, type PreselectedCommentMetadata } from './getCommentRouteData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';

interface SingleCommentProps {
  comment: PaginatedComments['comments'][number];
  readonly?: boolean;
  isReply?: boolean;
  isToggleReply?: boolean;
  onClickReply?: (replyingTo: string) => void;
  onClickToggleReply?: () => void;
  preselectedCommentMetadata?: PreselectedCommentMetadata;
  deleteComment: (commentId: number) => Promise<void>;
  updateComment: (text: string, commentId: number) => Promise<void>;
}

type CommentProps = SingleCommentProps & {
  preselectedCommentMetadata?: PreselectedCommentMetadata;
  root: ChallengeRouteData['challenge'] | SolutionRouteData;
  type: CommentRoot;
  deleteComment: (commentId: number) => Promise<void>;
  updateComment: (text: string, commentId: number) => Promise<void>;
};

export interface CommentReportSchemaType {
  spam: boolean;
  threat: boolean;
  hate_speech: boolean;
  bullying: boolean;
  text: string;
}

// million-ignore
export function Comment({
  comment,
  preselectedCommentMetadata,
  readonly = false,
  root,
  type,
  deleteComment,
  updateComment,
}: CommentProps) {
  const params = useSearchParams();
  const replyId = params.get('replyId');

  const timeoutRef = useRef<NodeJS.Timeout>(undefined);

  const hasPreselectedReply =
    preselectedCommentMetadata?.selectedComment?.id === comment.id && Boolean(replyId);

  const [showReplies, setShowReplies] = useState(hasPreselectedReply);
  const [isReplying, setIsReplying] = useState(false);

  const {
    status,
    data,
    fetchNextPage,
    addReplyComment,
    updateReplyComment,
    deleteReplyComment,
    showLoadMoreRepliesBtn,
  } = useCommentsReplies({
    enabled: showReplies,
    root,
    type,
    parentComment: comment,
    preselectedReplyId: hasPreselectedReply ? Number(replyId) : undefined,
  } as UseCommentRepliesProps);

  const toggleReplies = () => {
    if (showReplies) {
      setIsReplying(false);
    }

    setShowReplies(!showReplies);
  };
  const toggleIsReplying = () => setIsReplying(!isReplying);

  const commentInputRef = useRef<{
    textarea: HTMLTextAreaElement;
    setInputValue: (value: string) => void;
  }>(null);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  function prefillReplyInput(replyingTo: string) {
    if (commentInputRef?.current) {
      const name = `@${replyingTo} `;
      commentInputRef.current.setInputValue(name);
      commentInputRef.current.textarea?.setSelectionRange(name.length, name.length);
      commentInputRef.current.textarea?.focus();
      window.requestAnimationFrame(
        () =>
          commentInputRef.current?.textarea?.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth',
          }),
      );
    }
  }

  const showReplyInput = (replyingTo: string) => {
    setIsReplying(true);
    clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => prefillReplyInput(replyingTo));
  };

  const hideReplyInput = () => {
    setIsReplying(false);
    clearTimeout(timeoutRef.current);
  };

  return (
    <div className="flex flex-col px-2 py-1">
      <SingleComment
        preselectedCommentMetadata={preselectedCommentMetadata}
        comment={comment}
        isToggleReply={showReplies}
        onClickReply={toggleIsReplying}
        onClickToggleReply={toggleReplies}
        readonly={readonly}
        deleteComment={deleteComment}
        updateComment={updateComment}
      />

      {showReplies && status === 'pending' ? <CommentSkeleton /> : null}
      {showReplies ? (
        <>
          <div className="flex flex-col gap-1 pl-6 pt-1">
            {data?.pages.flatMap((page) =>
              page.replies.map((reply) => (
                // this is a reply
                <SingleComment
                  comment={reply}
                  isReply
                  key={reply.id}
                  preselectedCommentMetadata={preselectedCommentMetadata}
                  deleteComment={deleteReplyComment}
                  updateComment={updateReplyComment}
                  onClickReply={(replyingTo) => showReplyInput(replyingTo)}
                />
              )),
            )}
          </div>
          {showLoadMoreRepliesBtn ? (
            <Button
              variant="ghost"
              className="gap-1 text-xs text-neutral-500 duration-200 hover:text-neutral-400 dark:text-neutral-400 dark:hover:text-neutral-300"
              onClick={() => fetchNextPage()}
            >
              <MoreHorizontal size={24} />
              Load More
              <span className="sr-only">Load More</span>
            </Button>
          ) : null}
        </>
      ) : null}

      {isReplying ? (
        <div className="relative mt-2 pb-2 pl-8">
          <Reply className="absolute left-2 top-2 h-4 w-4 opacity-50" />
          <CommentInput
            mode="edit"
            onCancel={() => hideReplyInput()}
            onSubmit={async (text) => {
              await addReplyComment(text);
              hideReplyInput();
              setShowReplies(true);
            }}
            ref={commentInputRef}
          />
        </div>
      ) : null}
    </div>
  );
}

const SELECTED_CLASSES = 'rounded-md bg-sky-300/20';

// million-ignore
function SingleComment({
  comment,
  isReply,
  isToggleReply,
  onClickReply,
  onClickToggleReply,
  readonly = false,
  preselectedCommentMetadata,
  deleteComment,
  updateComment,
}: SingleCommentProps) {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const replyId = searchParams.get('replyId');
  const [isEditing, setIsEditing] = useState(false);
  const elRef = useRef<HTMLDivElement | null>(null);
  const session = useSession();

  const isHighlighted = replyId
    ? Number(replyId) === comment.id
    : preselectedCommentMetadata?.selectedComment?.id === comment.id;

  async function copyPathNotifyUser(isReply: boolean, slug: string) {
    try {
      await copyCommentUrlToClipboard(isReply, slug);
      toast({
        title: 'Success!',
        variant: 'success',
        description: <p>Copied comment URL to clipboard!</p>,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Failure!',
        variant: 'destructive',
        description: <p>Something went wrong!</p>,
      });
    }
  }

  async function copyCommentUrlToClipboard(isReply: boolean, slug: string) {
    const commentId = isReply ? comment.parentId : comment.id;
    const paramsObj = { replyId: String(comment.id) };
    const searchParams = new URLSearchParams(paramsObj);

    const { rootType, rootSolutionId } = comment;
    const baseURL = `${window.location.origin}/challenge/${slug}`;
    const hasGetParams = isReply ? `?${searchParams.toString()}` : '';

    const shareUrl =
      rootType === 'CHALLENGE'
        ? `${baseURL}/comments/${commentId}${hasGetParams}`
        : `${baseURL}/solutions/${rootSolutionId}/comments/${commentId}${hasGetParams}`;

    await navigator.clipboard.writeText(shareUrl);
  }

  const loggedinUser = useSession();

  const isAuthor = loggedinUser.data?.user?.id === comment.user.id;
  const isAdminAndModerator = isAdminOrModerator(loggedinUser.data);

  const hasBeenEdited = comment.updatedAt.getTime() > comment.createdAt.getTime();

  useEffect(() => {
    if (!isHighlighted) return;
    const timeout = setTimeout(() => {
      elRef.current?.classList.remove(...SELECTED_CLASSES.split(' '));
    }, 5000);
    window.requestAnimationFrame(() => elRef.current?.scrollIntoView({ block: 'nearest' }));
    return () => {
      clearTimeout(timeout);
    };
  }, [isHighlighted]);

  return (
    <div
      id={`comment-${comment.id}`}
      className={clsx(
        'group relative p-2 pl-3',
        isHighlighted && SELECTED_CLASSES,
        'transition-colors',
        'duration-150',
      )}
      ref={elRef}
    >
      <div className="flex items-start justify-between gap-4 pr-[0.4rem]">
        <div className="mb-2 flex w-full items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <UserAvatar src={comment.user?.image ?? ''} />
            <UserBadge
              user={{
                name: comment.user?.name ?? '',
                image: comment.user?.image ?? '',
                bio: comment.user?.bio ?? '',
                roles: comment.user?.roles ?? [],
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Tooltip delayDuration={0.05}>
              <TooltipTrigger asChild>
                <div className="text-muted-foreground flex items-center gap-2 whitespace-nowrap text-xs">
                  <Calendar className="h-4 w-4" />
                  <span>{getRelativeTimeStrict(comment.createdAt)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent align="start" alignOffset={-55} className="rounded-xl">
                <span className="text-foreground text-xs">
                  {comment.createdAt.toLocaleString()}
                </span>
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center">
                <Button variant="outline" size="xs">
                  <EllipsisVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-neutral-900">
                <DropdownMenuItem>
                  <div>
                    <Tooltip>
                      <TooltipTrigger>
                        <div
                          className="flex items-center gap-2"
                          onClick={() => {
                            copyPathNotifyUser(Boolean(isReply), slug as string);
                          }}
                        >
                          <Share className="h-4 w-4" />
                          Share
                          <span className="sr-only">Share this comment</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Share this comment</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <div>
                    {isAuthor ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <div
                            onClick={() => setIsEditing(!isEditing)}
                            className="flex items-center gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                            <span className="sr-only">Edit this comment</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit this comment</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                </DropdownMenuItem>
                <div>
                  {isAuthor || isAdminAndModerator ? (
                    <Tooltip>
                      <CommentDeleteDialog asChild comment={comment} deleteComment={deleteComment}>
                        <TooltipTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <div className="flex items-center gap-2">
                              <Trash2 className="h-4 w-4" />
                              Delete
                              <span className="sr-only">Delete this comment</span>
                            </div>
                          </DropdownMenuItem>
                        </TooltipTrigger>
                      </CommentDeleteDialog>
                      <TooltipContent>
                        <p>Delete this comment</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <ReportDialog triggerAsChild commentId={comment.id} reportType="COMMENT">
                        <TooltipTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <div className="flex items-center gap-2">
                              <Flag className="h-4 w-4" />
                              Report
                              <span className="sr-only">Report this comment</span>
                            </div>
                          </DropdownMenuItem>
                        </TooltipTrigger>
                      </ReportDialog>
                      <TooltipContent>
                        <p>Report this comment</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <ExpandableContent content={comment.text} />
      </div>

      <div className="mb-2 flex flex-row flex-wrap items-center justify-between">
        {!isEditing && (
          <div className="flex gap-4">
            {comment._count.replies > 0 && (
              <Button
                variant="secondary"
                size="xs"
                className="z-50 gap-1"
                onClick={onClickToggleReply}
              >
                {isToggleReply ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}

                <div className="text-xs">
                  {comment._count.replies === 1 ? '1 reply' : `${comment._count.replies} replies`}
                </div>
                <span className="sr-only">Toggle replies view</span>
              </Button>
            )}
            {hasBeenEdited ? (
              <div className="text-muted-foreground flex items-center gap-2 whitespace-nowrap text-xs">
                Last edited at{' '}
                {new Intl.DateTimeFormat(undefined, {
                  timeStyle: 'short',
                  dateStyle: 'short',
                }).format(comment.updatedAt)}
              </div>
            ) : null}
          </div>
        )}
        <div className="flex flex-col items-end">
          {!readonly && (
            <>
              <div className="flex gap-1">
                <Vote
                  comment={comment}
                  toUserId={comment.user.id}
                  challengeSlug={comment.rootChallenge?.slug ?? ''}
                  voteCount={comment._count.vote}
                  initialHasVoted={comment.vote.length > 0}
                  disabled={!session?.data?.user?.id || comment.userId === session?.data?.user?.id}
                  rootType="COMMENT"
                  rootId={comment.id}
                  onVote={(didUpvote: boolean) => {
                    comment.vote = didUpvote
                      ? [
                          {
                            userId: session?.data?.user?.id ?? '',
                          },
                        ]
                      : [];
                    comment._count.vote += didUpvote ? 1 : -1;
                  }}
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => onClickReply?.(comment?.user?.name)}
                    >
                      <Reply className="h-3 w-3" />
                      <span className="sr-only">Create a reply</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reply</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="mb-2">
          <CommentInput
            mode="edit"
            defaultValue={comment.text}
            onCancel={() => {
              setIsEditing(false);
            }}
            onSubmit={async (text) => {
              await updateComment(text, comment.id);
              setIsEditing(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function ExpandableContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(true);
  const [isLarge, setIsLarge] = useState(false);
  const contentWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if ((contentWrapperRef.current?.clientHeight ?? 0) > 150) {
        setExpanded(false);
        setIsLarge(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [content]);

  return (
    <div
      className={clsx(
        { 'h-full': expanded, 'max-h-[150px]': !expanded },
        'relative w-full overflow-hidden break-words pl-[1px] text-sm',
      )}
      ref={contentWrapperRef}
    >
      <Markdown>{content}</Markdown>
      {!expanded && (
        <div
          className="absolute top-0 flex h-full w-full cursor-pointer items-end bg-gradient-to-b from-transparent to-white dark:to-zinc-800"
          onClick={() => setExpanded(true)}
        >
          <div className="text-md text-label-1 dark:text-dark-label-1 flex w-full items-center justify-center hover:bg-transparent">
            Read more
          </div>
        </div>
      )}
      {expanded && isLarge ? (
        <div className="flex w-full items-center justify-center">
          <Button
            variant="ghost"
            size="xs"
            className="z-50 mx-auto gap-1"
            onClick={() => {
              setExpanded(false);
            }}
          >
            <ChevronUp className="h-4 w-4" />
            collapse
          </Button>
        </div>
      ) : null}
    </div>
  );
}
