'use client';

import { FormField, FormItem, FormMessage } from '@repo/ui/components/form';
import { Markdown } from '@repo/ui/components/markdown';
import { TypographyH3 } from '@repo/ui/components/typography/h3';
import { useWatch } from 'react-hook-form';
import { RichMarkdownEditor } from '~/components/rich-markdown-editor';
import { type WizardForm } from '.';

interface Props {
  form: WizardForm;
}

export function DescriptionEditor({ form }: Props) {
  const description = useWatch({ control: form.control, name: 'description' });
  return (
    <div className="flex h-full flex-1 flex-col">
      <TypographyH3 className="mx-auto mb-4 lg:mb-6">Create Challenge Description</TypographyH3>
      <div className="flex flex-1 flex-wrap gap-2 md:flex-nowrap">
        <div className="flex w-full flex-col gap-2 overflow-hidden rounded-2xl border border-zinc-300 md:w-[500px] md:rounded-r-xl dark:border-zinc-700">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => {
              return (
                <>
                  <FormItem className="h-full">
                    <RichMarkdownEditor
                      dismissPreview
                      allowImageUpload
                      onChange={field.onChange}
                      value={field.value}
                    />
                  </FormItem>
                  <FormMessage className="p-2 pt-0" />
                </>
              );
            }}
          />
        </div>
        <div className="w-full rounded-r-2xl rounded-l-2xl border border-zinc-300 bg-white p-3 md:h-full md:rounded-l-xl dark:border-zinc-700 dark:bg-zinc-800">
          <Markdown>{description}</Markdown>
        </div>
      </div>
    </div>
  );
}
