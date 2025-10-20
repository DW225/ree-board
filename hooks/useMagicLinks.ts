import useSWR from 'swr';
import { fetcher } from '@/lib/utils';
import type {
  CreateLinkRequest,
  LinkWithCreator,
  GetLinksResponse,
  CreateLinkResponse,
  RevokeLinkResponse
} from '@/lib/types/link';
import { toast } from 'sonner';

/**
 * SWR hook for managing magic links for a board
 * Provides fetching, creating, and revoking functionality with optimistic updates
 */
export function useMagicLinks(boardId: string) {
  const { data, error, isLoading, mutate } = useSWR<GetLinksResponse>(
    boardId ? `/api/board/${boardId}/links` : null,
    fetcher,
    {
      revalidateOnFocus: false, // Don't revalidate when modal gains focus
      revalidateOnReconnect: true, // Revalidate on network reconnect
      dedupingInterval: 30000, // Cache for 30 seconds
      errorRetryCount: 3, // Retry failed requests 3 times
      errorRetryInterval: 1000, // Wait 1 second between retries
    }
  );

  /**
   * Helper to format expiration time for display
   */
  const formatExpirationDisplay = (hours: number): string => {
    if (hours === 0) {
      return 'never';
    }
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  /**
   * Creates a new magic link with optimistic updates
   */
  const createLink = async (linkData: CreateLinkRequest) => {
    try {
      // Generate optimistic link for immediate UI feedback
      const optimisticLink: LinkWithCreator = {
        id: Date.now(), // Temporary ID
        token: 'creating...', // Placeholder token
        role: linkData.role,
        boardId,
        createdAt: new Date(),
        creator: null,
        expiresAt: linkData.expirationHours
          ? new Date(Date.now() + linkData.expirationHours * 60 * 60 * 1000)
          : null,
        creatorName: 'You',
        isExpired: false,
        expiresIn: formatExpirationDisplay(linkData.expirationHours)
      };

      // Optimistic update - show the new link immediately
      mutate(
        (currentData) => ({
          links: [...(currentData?.links || []), optimisticLink],
          count: (currentData?.links.length || 0) + 1
        }),
        false // Don't revalidate immediately
      );

      // Make API call
      const response = await fetch(`/api/board/${boardId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create magic link');
      }

      const result: CreateLinkResponse = await response.json();

      // Revalidate to get the real data from server
      mutate();

      return result;
    } catch (error) {
      // Revert optimistic update on error
      mutate();

      const errorMessage = error instanceof Error ? error.message : 'Failed to create magic link';
      toast.error(errorMessage);
      throw error;
    }
  };

  /**
   * Revokes a magic link with optimistic updates
   */
  const revokeLink = async (linkId: number) => {
    try {
      // Optimistic update - remove the link immediately
      mutate(
        (currentData) => ({
          links: currentData?.links.filter(link => link.id !== linkId) || [],
          count: Math.max((currentData?.links.length || 1) - 1, 0)
        }),
        false // Don't revalidate immediately
      );

      // Make API call
      const response = await fetch(`/api/board/${boardId}/links`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revoke magic link');
      }

      const result: RevokeLinkResponse = await response.json();

      // Revalidate to ensure consistency
      mutate();

      toast.success('Magic link revoked successfully');
      return result;
    } catch (error) {
      // Revert optimistic update on error
      mutate();

      const errorMessage = error instanceof Error ? error.message : 'Failed to revoke magic link';
      toast.error(errorMessage);
      throw error;
    }
  };

  /**
   * Refreshes the magic links data
   */
  const refresh = () => {
    mutate();
  };

  /**
   * Generates the full URL for a magic link token
   */
  const getLinkUrl = (token: string): string => {
    const baseUrl = globalThis.window !== undefined ? globalThis.location.origin : '';
    return `${baseUrl}/invite/${token}`;
  };

  /**
   * Copies a magic link URL to clipboard
   */
  const copyLinkToClipboard = async (token: string): Promise<void> => {
    try {
      const linkUrl = getLinkUrl(token);
      await navigator.clipboard.writeText(linkUrl);
      toast.success('Magic link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link to clipboard');
      throw error;
    }
  };

  /**
   * Filters links by status
   */
  const getActiveLinks = (): LinkWithCreator[] => {
    return data?.links.filter(link => !link.isExpired) || [];
  };

  const getExpiredLinks = (): LinkWithCreator[] => {
    return data?.links.filter(link => link.isExpired) || [];
  };

  const getLinksByRole = (role: number): LinkWithCreator[] => {
    return data?.links.filter(link => link.role === role) || [];
  };

  return {
    // Data
    links: data?.links || [],
    activeLinks: getActiveLinks(),
    expiredLinks: getExpiredLinks(),
    linkCount: data?.count || 0,

    // State
    isLoading,
    isError: !!error,
    error,

    // Actions
    createLink,
    revokeLink,
    refresh,

    // Utilities
    getLinkUrl,
    copyLinkToClipboard,
    getLinksByRole,

    // Raw mutate for advanced usage
    mutate
  };
}

/**
 * Type for the hook return value (for better TypeScript support)
 */
export type UseMagicLinksReturn = ReturnType<typeof useMagicLinks>;
