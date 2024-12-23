import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from '@repo/auth/react';
import { Button } from '@repo/ui/components/button';
import { Form, FormField, FormItem, FormMessage } from '@repo/ui/components/form';
import { Markdown } from '@repo/ui/components/markdown';
import { Loader2 } from '@repo/ui/icons';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useForm } from 'react-hook-form';
import { MentionInput } from '~/components/mention/mention-input';
import { singleFieldSchema, type SingleFieldSchema } from '~/utils/zodSingleStringField';

interface CommentInputProps {
  mode: 'create' | 'edit' | 'reply';
  onCancel?: () => void;
  placeholder?: string;
  onSubmit: (text: string) => Promise<void>;
  defaultValue?: string;
}

interface CommentInputRefProps {
  textarea: HTMLTextAreaElement;
  setInputValue: (value: string) => void;
}

export const CommentInput = forwardRef<CommentInputRefProps, CommentInputProps>(
  ({ mode, onCancel, placeholder, onSubmit, defaultValue }: CommentInputProps, ref) => {
    const { data: session } = useSession();
    const [commentMode, setCommentMode] = useState<'editor' | 'preview'>('editor');

    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

    const form = useForm<SingleFieldSchema>({
      resolver: zodResolver(singleFieldSchema),
      defaultValues: { text: defaultValue ?? '' },
    });

    // We need to control the textarea element from parent component.
    useImperativeHandle(ref, () => ({
      // TODO: Either textAreaRef is always defined, or textarea can be nullish
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      textarea: textAreaRef?.current!,
      setInputValue: (value: string) => {
        form.setValue('text', value);
        form.trigger();
      },
    }));

    const formValid = form.formState.isValid;
    const value = form.watch('text');

    useAutosizeTextArea(textAreaRef, value, commentMode);

    const submitComment = async ({ text }: { text: string }) => {
      try {
        await onSubmit(text);
      } catch (e) {
        console.error(e);
      } finally {
        form.reset();
        setCommentMode('editor');
      }
    };

    const isSubmitting = form.formState.isSubmitting;

    return (
      <div className="relative flex flex-col">
        {commentMode === 'editor' && (
          <div className="rounded-xl rounded-br-lg bg-neutral-100 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-700/90">
            <Form {...form}>
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <MentionInput
                      disabled={!session?.user}
                      autoFocus
                      className="resize-none border-0 px-3 py-2 focus-visible:ring-0 md:max-h-[calc(100vh_-_232px)]"
                      onChange={(e) => {
                        field.onChange(e);
                        form.trigger();
                      }}
                      onKeyDown={(e) => {
                        if (isSubmitting) {
                          e.preventDefault();
                        }
                      }}
                      placeholder={
                        placeholder ?? !session?.user
                          ? 'You need to be logged in to comment.'
                          : 'Enter your comment here.'
                      }
                      forwardedref={textAreaRef}
                      value={value}
                    />
                    <FormMessage className="absolute h-8 pl-3 leading-8" />
                  </FormItem>
                )}
              />
            </Form>
          </div>
        )}
        {commentMode === 'preview' && (
          <div className="min-h-[5rem] overflow-y-auto break-words px-3 pt-2 text-sm md:max-h-[calc(100vh_-_232px)]">
            <Markdown>{value}</Markdown>
          </div>
        )}
        <div className="flex justify-end">
          <div className="flex gap-2 p-2 pl-0">
            <Button
              className="h-8"
              disabled={isSubmitting || value.length === 0}
              onClick={() => setCommentMode(commentMode === 'editor' ? 'preview' : 'editor')}
              variant={mode === 'create' ? 'secondary' : 'ghost'}
            >
              {commentMode === 'editor' ? 'Preview' : 'Edit'}
            </Button>
            {mode !== 'create' && (
              <Button className="h-8" onClick={() => onCancel?.()} variant="secondary">
                Cancel
              </Button>
            )}
            <Button
              className="h-8 w-[5.5rem] rounded-lg rounded-br-sm"
              disabled={value.length === 0 || isSubmitting || !formValid}
              onClick={form.handleSubmit(submitComment)}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Comment'}
            </Button>
          </div>
        </div>
      </div>
    );
  },
);
CommentInput.displayName = `CommentInput`;

function useAutosizeTextArea(
  textAreaRef: RefObject<HTMLTextAreaElement | null>,
  value: string,
  commentMode: string,
) {
  useEffect(() => {
    if (textAreaRef.current) {
      // We need to reset the height momentarily to get the correct scrollHeight for the textarea
      textAreaRef.current.style.height = '0px';
      const scrollHeight = textAreaRef.current.scrollHeight;

      // We then set the height directly, outside of the render loop
      // Trying to set this with state or a ref will product an incorrect value.
      textAreaRef.current.style.height = `${scrollHeight}px`;
    }
    // TODO: Fix this incorrect set of deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textAreaRef.current, value, commentMode]);
}
