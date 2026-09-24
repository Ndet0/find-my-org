import { messageAad, sealMessage } from '@opsflow/crypto'
import { DM_BODY_MAX, type DmMessageItem, mergeMessages } from '@opsflow/types/dm'
import { colors } from '@opsflow/ui/colors'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Button } from '@/components/button'
import { ErrorText } from '@/components/error-text'
import { CONTROL_CLASSES, controlBorder } from '@/components/field'
import { ListFooter } from '@/components/list-footer'
import { describeError, Message } from '@/components/message'
import { MessagingGate, useIdentity } from '@/components/messaging-gate'
import { useCurrentUser } from '@/lib/current-user'
import { formatDateTime } from '@/lib/dates'
import {
  conversationKeyFor,
  conversationQueryOptions,
  dmKeys,
  fetchOlderMessages,
  latestMessagesQueryOptions,
  markConversationRead,
  type OpenedMessage,
  openMessages,
  sendMessage,
} from '@/lib/dm'
import { notificationKeys } from '@/lib/notifications'

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>()
  const user = useCurrentUser()

  if (!user) {
    return null
  }

  return (
    <View className="flex-1 bg-neutral-100 dark:bg-neutral-950 px-4">
      <MessagingGate user={user}>
        <Thread key={conversationId} conversationId={conversationId} userId={user.id} />
      </MessagingGate>
    </View>
  )
}

/**
 * One thread, newest at the bottom. The list is inverted, so "the end" a
 * scroll reaches is the top, where older pages are pulled in and merged
 * by id. Every message is opened on the phone with the conversation key,
 * and every message sent is sealed here first.
 */
function Thread({ conversationId, userId }: { conversationId: string; userId: string }) {
  const identity = useIdentity()
  const queryClient = useQueryClient()
  const { colorScheme } = useColorScheme()
  const conversation = useQuery(conversationQueryOptions(conversationId))
  const latest = useQuery(latestMessagesQueryOptions(conversationId))
  const [older, setOlder] = useState<{ items: DmMessageItem[]; hasMore: boolean } | null>(null)
  const [draft, setDraft] = useState('')

  const peer = conversation.data?.peer
  const peerPublicKey = peer?.publicKey ?? null
  const key = useMemo(
    () => (peerPublicKey ? conversationKeyFor(identity, peerPublicKey) : null),
    [identity, peerPublicKey],
  )

  const messages = useMemo(
    () => mergeMessages(older?.items ?? [], latest.data?.items ?? []),
    [older, latest.data],
  )
  const openedList = useMemo(() => (key ? openMessages(key, messages) : []), [key, messages])
  const newestFirst = useMemo(() => [...openedList].reverse(), [openedList])
  const hasMore = older ? older.hasMore : (latest.data?.hasMore ?? false)
  const oldestId = messages[0]?.id

  // Being on the thread is reading it; re-sent when the other side writes.
  const newestFromPeer = [...messages].reverse().find((m) => m.senderId !== userId)?.id
  const loaded = latest.data !== undefined
  // biome-ignore lint/correctness/useExhaustiveDependencies: `newestFromPeer` is the trigger, not an input
  useEffect(() => {
    if (!loaded) return
    // Best effort: a failed read receipt is retried on the next message
    // from the other side, and is not worth an error in the thread.
    void markConversationRead(conversationId)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: dmKeys.conversations })
        void queryClient.invalidateQueries({ queryKey: dmKeys.unreadCount })
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      })
      .catch(() => undefined)
  }, [conversationId, newestFromPeer, loaded, queryClient])

  const loadOlder = useMutation({
    mutationFn: () => fetchOlderMessages(conversationId, oldestId as string),
    onSuccess: (page) => {
      setOlder((previous) => ({
        items: mergeMessages(previous?.items ?? [], page.items),
        hasMore: page.hasMore,
      }))
    },
  })

  // The text is taken from the composer as the send starts, so what is typed
  // while it is in flight is kept, and a refused send puts the text back.
  const send = useMutation({
    mutationFn: async (text: string) => {
      if (!key) throw new Error('This person has no messaging key')
      const sealed = sealMessage(key, text, messageAad(conversationId, userId))
      return sendMessage(conversationId, { ...sealed, version: 1 })
    },
    onMutate: () => setDraft(''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dmKeys.latestMessages(conversationId) })
      void queryClient.invalidateQueries({ queryKey: dmKeys.conversations })
    },
    onError: (_error, text) => {
      setDraft((current) => (current === '' ? text : current))
    },
  })

  if (conversation.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (conversation.isError || !peer) {
    return (
      <Message
        title="Conversation unavailable"
        body={describeError(conversation.error)}
        onRetry={() => conversation.refetch()}
      />
    )
  }

  const active = peer.status === 'active'
  const canSend = draft.trim() !== '' && !send.isPending && key !== null && active

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      className="flex-1"
    >
      <Stack.Screen options={{ title: peer.name }} />

      {latest.isError ? (
        <ErrorText className="py-2">{describeError(latest.error)}</ErrorText>
      ) : null}

      <FlatList
        data={newestFirst}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Bubble message={item} own={item.senderId === userId} />}
        ItemSeparatorComponent={() => <View className="h-2" />}
        contentContainerClassName="py-3"
        onEndReached={() => {
          if (hasMore && !loadOlder.isPending && oldestId) loadOlder.mutate()
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          <ListFooter loading={loadOlder.isPending} failed={loadOlder.isError} />
        }
        ListEmptyComponent={
          latest.isPending ? (
            <ActivityIndicator className="py-8" />
          ) : (
            // Inverted: the empty component renders upside down without this.
            <View style={{ transform: [{ scaleY: -1 }] }}>
              <Message
                title={key ? 'No messages yet' : `${peer.name} is not set up yet`}
                body={
                  key
                    ? `Say hello — only ${peer.name} can read it.`
                    : 'They need to sign in once before you can write to them.'
                }
              />
            </View>
          )
        }
      />

      <View className="flex-row items-end gap-2 border-t border-neutral-200 dark:border-neutral-800 py-3">
        <TextInput
          accessibilityLabel={`Message ${peer.name}`}
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={DM_BODY_MAX}
          editable={active && key !== null}
          placeholder={active ? 'Write a message…' : 'This account is not active'}
          placeholderTextColor={colorScheme === 'dark' ? colors.neutral[500] : colors.neutral[400]}
          className={`flex-1 max-h-32 ${CONTROL_CLASSES} ${controlBorder(false)}`}
        />
        <Button
          title={send.isPending ? '…' : 'Send'}
          disabled={!canSend}
          onPress={() => send.mutate(draft.trim())}
        />
      </View>
      {send.isError ? <ErrorText className="pb-2">{describeError(send.error)}</ErrorText> : null}
    </KeyboardAvoidingView>
  )
}

function Bubble({ message, own }: { message: OpenedMessage; own: boolean }) {
  return (
    <View className={`gap-0.5 ${own ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[80%] rounded-xl px-3 py-2 ${own ? 'bg-neutral-900 dark:bg-neutral-50' : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800'}`}
      >
        <Text
          className={`text-base ${message.text === null ? 'italic' : ''} ${own ? 'text-white dark:text-neutral-900' : 'text-neutral-900 dark:text-neutral-50'}`}
        >
          {message.text ?? 'This message could not be decrypted.'}
        </Text>
      </View>
      <Text className="text-xs text-neutral-500 dark:text-neutral-400">
        {formatDateTime(message.createdAt)}
      </Text>
    </View>
  )
}
