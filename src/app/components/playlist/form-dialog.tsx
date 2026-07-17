import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { toast } from 'react-toastify'
import { z } from 'zod'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form'
import { Input } from '@/app/components/ui/input'
import { Switch } from '@/app/components/ui/switch'
import { Textarea } from '@/app/components/ui/textarea'
import { subsonic } from '@/service/subsonic'
import { usePlaylists } from '@/store/playlists.store'
import { PlaylistData } from '@/types/playlistsContext'
import { queryKeys } from '@/utils/queryKeys'

const playlistSchema = z.object({
  name: z.string().min(2, { message: 'playlist.form.validations.nameLength' }),
  comment: z.string(),
  isPublic: z.boolean(),
})

type PlaylistSchema = z.infer<typeof playlistSchema>

const defaultValues: PlaylistSchema = {
  name: '',
  comment: '',
  isPublic: false,
}

export function CreatePlaylistDialog() {
  const { t } = useTranslation()
  const { data, setData, playlistDialogState, setPlaylistDialogState } =
    usePlaylists()

  const isCreation = Object.keys(data).length === 0

  const form = useForm<PlaylistSchema>({
    resolver: zodResolver(playlistSchema),
    defaultValues,
  })

  useEffect(() => {
    if (isCreation) {
      form.reset(defaultValues)
    } else {
      form.reset({
        name: data.name ?? '',
        comment: data.comment ?? '',
        isPublic: false,
      })
    }
  }, [data, form, isCreation])

  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: subsonic.playlists.createWithDetails,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queryKeys.playlist.all],
      })
      toast.success(t('playlist.form.create.toast.success'))
    },
    onError: () => {
      toast.error(t('playlist.form.create.toast.success'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: subsonic.playlists.update,
    onSuccess: () => {
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: [queryKeys.playlist.all],
        }),
        queryClient.invalidateQueries({
          queryKey: [queryKeys.playlist.single, data.id],
        }),
      ])
      toast.success(t('playlist.form.edit.toast.success'))
    },
    onError: () => {
      toast.error(t('playlist.form.edit.toast.error'))
    },
  })

  async function onSubmit({ name, comment }: PlaylistSchema) {
    if (isCreation) {
      await createMutation.mutateAsync({
        name,
        comment,
        isPublic: 'false',
      })
    } else {
      await updateMutation.mutateAsync({
        playlistId: data.id,
        name,
        comment,
        isPublic: 'false',
      })
    }

    setPlaylistDialogState(false)
    clear()
  }

  function clear() {
    setData({} as PlaylistData)
  }

  return (
    <Dialog
      defaultOpen={false}
      open={playlistDialogState}
      onOpenChange={(state) => {
        if (!state) clear()
        setPlaylistDialogState(state)
      }}
    >
      <DialogContent className="max-w-[500px]" aria-describedby={undefined}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {t(`playlist.form.${isCreation ? 'create' : 'edit'}.title`)}
              </DialogTitle>
            </DialogHeader>

            <div className="my-4 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="required">
                      {t('playlist.form.labels.name')}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} id="playlist-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('playlist.form.labels.comment')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t(
                          'playlist.form.labels.commentDescription',
                        )}
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit">
                {t(`playlist.form.${isCreation ? 'create' : 'edit'}.button`)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
