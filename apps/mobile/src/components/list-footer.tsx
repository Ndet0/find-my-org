import { ActivityIndicator, View } from 'react-native'
import { ErrorText } from '@/components/error-text'

/**
 * What a list shows under its last row while it fetches the next page.
 *
 * Plain booleans rather than the query object, so this stays one component for
 * six screens without a generic over `UseInfiniteQueryResult`. Feed it
 * `isFetchingNextPage` and `isFetchNextPageError` — never `isFetching` or
 * `isError`, which are true for the first load and the whole-list refetch too.
 *
 * Nothing renders once every page is loaded, and nothing renders on an empty
 * list: `totalPages` is clamped to at least 1 server-side, so page 1 of 1
 * leaves `hasNextPage` false and both flags down.
 *
 * A failed next page gets a line, not a retry button. Scrolling reaches the
 * end again, which is the same gesture that asked for the page in the first
 * place.
 */
export function ListFooter({ loading, failed }: { loading: boolean; failed: boolean }) {
  if (!loading && !failed) {
    return null
  }

  return (
    <View className="items-center py-4">
      {loading ? (
        <ActivityIndicator />
      ) : (
        <ErrorText>Could not load more. Scroll to retry.</ErrorText>
      )}
    </View>
  )
}
