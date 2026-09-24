import type { DmConversationItem } from '@opsflow/types/dm'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouter } from 'expo-router'
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native'
import { Button } from '@/components/button'
import { PressableCard } from '@/components/card'
import { describeError, Message } from '@/components/message'
import { MessagingGate, useIdentity } from '@/components/messaging-gate'
import { Screen } from '@/components/screen'
import { useCurrentUser } from '@/lib/current-user'
import { formatDateTime } from '@/lib/dates'
import { conversationKeyFor, conversationsQueryOptions, openMessages } from '@/lib/dm'

/**
 * Direct messages: every thread the person is part of, most recent
 * activity first, behind the gate that holds the key to open them. The
 * "New" button sits behind the gate too: a conversation cannot be opened
 * without a key, so it is not offered before there is one.
 */
export default function MessagesScreen() {
  const user = useCurrentUser()
  const router = useRouter()

  if (!user) {
    return null
  }

  return (
    <Screen>
      <View className="gap-1 py-4">
        <Text className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Messages
        </Text>
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">
          End-to-end encrypted. Only you and the other person can read them.
        </Text>
      </View>

      <MessagingGate user={user}>
        <View className="flex-row justify-end pb-3">
          <Button title="New" size="sm" onPress={() => router.push('/messages/new')} />
        </View>
        <ConversationList userId={user.id} />
      </MessagingGate>
    </Screen>
  )
}

function ConversationList({ userId }: { userId: string }) {
  const conversations = useQuery(conversationsQueryOptions())

  if (conversations.isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (conversations.isError) {
    return (
      <Message
        title="Conversations could not be loaded"
        body={describeError(conversations.error)}
        onRetry={() => conversations.refetch()}
      />
    )
  }

  return (
    <FlatList
      data={conversations.data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ConversationRow conversation={item} userId={userId} />}
      ItemSeparatorComponent={() => <View className="h-2" />}
      contentContainerClassName="pb-6"
      ListEmptyComponent={
        <Message title="No conversations yet" body="Start one with the New button." />
      }
      refreshControl={
        <RefreshControl
          refreshing={conversations.isRefetching}
          onRefresh={() => conversations.refetch()}
        />
      }
    />
  )
}

function ConversationRow({
  conversation,
  userId,
}: {
  conversation: DmConversationItem
  userId: string
}) {
  const identity = useIdentity()
  const { peer, lastMessage, unread } = conversation

  let preview = 'No messages yet'
  if (lastMessage && peer.publicKey) {
    const [openedMessage] = openMessages(conversationKeyFor(identity, peer.publicKey), [
      lastMessage,
    ])
    const text = openedMessage?.text ?? null
    preview =
      text === null
        ? 'Message could not be decrypted'
        : `${lastMessage.senderId === userId ? 'You: ' : ''}${text.replace(/\s+/g, ' ').trim()}`
  }

  return (
    <Link
      href={{ pathname: '/messages/[conversationId]', params: { conversationId: conversation.id } }}
      asChild
    >
      <PressableCard className="gap-1">
        <View className="flex-row items-center justify-between gap-3">
          <Text
            className={`flex-1 text-base ${unread > 0 ? 'font-semibold' : 'font-medium'} text-neutral-900 dark:text-neutral-50`}
            numberOfLines={1}
          >
            {peer.name}
          </Text>
          {unread > 0 ? (
            <View className="min-w-6 items-center rounded-full bg-neutral-900 dark:bg-neutral-50 px-1.5 py-0.5">
              <Text className="text-xs font-semibold text-white dark:text-neutral-900">
                {unread > 99 ? '99+' : unread}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-sm text-neutral-600 dark:text-neutral-400" numberOfLines={1}>
          {preview}
        </Text>
        <Text className="text-xs capitalize text-neutral-500 dark:text-neutral-400">
          {peer.role}
          {lastMessage ? ` · ${formatDateTime(lastMessage.createdAt)}` : ''}
        </Text>
      </PressableCard>
    </Link>
  )
}
