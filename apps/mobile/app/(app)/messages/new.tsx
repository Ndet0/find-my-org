import type { DmContact } from '@opsflow/types/dm'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Text, View } from 'react-native'
import { PressableCard } from '@/components/card'
import { ErrorText } from '@/components/error-text'
import { Field } from '@/components/field'
import { describeError, Message } from '@/components/message'
import { contactsQueryOptions, dmKeys, openConversation } from '@/lib/dm'

/**
 * Who to write to. The list is the API's answer to "whom may I message",
 * so the role rule is applied there; someone who has not signed in since
 * messaging arrived has no key yet and is shown but not selectable.
 */
export default function NewMessageScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setQ(draft.trim()), 250)
    return () => clearTimeout(timer)
  }, [draft])

  const contacts = useQuery(contactsQueryOptions(q))

  const start = useMutation({
    mutationFn: (userId: string) => openConversation({ userId }),
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({ queryKey: dmKeys.conversations })
      router.replace({
        pathname: '/messages/[conversationId]',
        params: { conversationId: conversation.id },
      })
    },
  })

  return (
    <View className="flex-1 bg-neutral-100 dark:bg-neutral-950 px-4">
      <View className="py-4">
        <Field
          label="Search"
          value={draft}
          onChangeText={setDraft}
          placeholder="Name, email or position"
          autoCapitalize="none"
          autoFocus
        />
      </View>

      {start.isError ? <ErrorText className="mb-3">{describeError(start.error)}</ErrorText> : null}

      {contacts.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : contacts.isError ? (
        <Message
          title="People could not be loaded"
          body={describeError(contacts.error)}
          onRetry={() => contacts.refetch()}
        />
      ) : (
        <FlatList
          data={contacts.data}
          keyExtractor={(contact) => contact.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ContactRow
              contact={item}
              pending={start.isPending && start.variables === item.id}
              onPress={() => start.mutate(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View className="h-2" />}
          contentContainerClassName="pb-6"
          ListEmptyComponent={
            <Message
              title={q ? 'Nobody matches' : 'Nobody to message yet'}
              body={q ? undefined : 'Only people you may message are listed.'}
            />
          }
        />
      )}
    </View>
  )
}

function ContactRow({
  contact,
  pending,
  onPress,
}: {
  contact: DmContact
  pending: boolean
  onPress: () => void
}) {
  const ready = contact.publicKey !== null

  return (
    <PressableCard
      disabled={!ready || pending}
      onPress={onPress}
      className={`gap-0.5 ${ready ? '' : 'opacity-60'}`}
    >
      <Text
        className="text-base font-medium text-neutral-900 dark:text-neutral-50"
        numberOfLines={1}
      >
        {contact.name}
      </Text>
      <Text className="text-xs capitalize text-neutral-500 dark:text-neutral-400">
        {contact.role}
        {contact.position ? ` · ${contact.position}` : ''}
        {contact.department ? ` · ${contact.department.name}` : ''}
      </Text>
      {!ready ? (
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">
          Not set up yet — they need to sign in once first
        </Text>
      ) : null}
      {pending ? (
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">Opening…</Text>
      ) : null}
    </PressableCard>
  )
}
