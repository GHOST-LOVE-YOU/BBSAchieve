import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from './avatar';
import { Pill, PillColor } from './pill';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  threadId: string;
  title: string;
  excerpt?: string;
  authorName: string;
  boardName?: string;
  boardSlug?: string;
  replyCount?: number;
  time?: string;
  pillColor?: PillColor;
  isBot?: boolean;
};

export function PostCard({
  threadId,
  title,
  excerpt,
  authorName,
  boardName,
  replyCount,
  time,
  pillColor = 'blue',
  isBot,
}: Props) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/threads/[threadId]', params: { threadId } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surface },
        pressed && { backgroundColor: theme.canvasSoft },
      ]}>
      <Avatar name={authorName} size={36} color={isBot ? theme.surfaceButter : undefined} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.ink }]} numberOfLines={2}>
          {title}
        </Text>

        {excerpt ? (
          <Text style={[styles.excerpt, { color: theme.inkTertiary }]} numberOfLines={2}>
            {excerpt}
          </Text>
        ) : null}

        <View style={styles.bottomRow}>
          {boardName ? <Pill label={boardName} color={pillColor} small /> : null}
          <Text style={[styles.author, { color: theme.inkSecondary }]} numberOfLines={1}>
            {authorName}
          </Text>
          {time ? <Text style={[styles.time, { color: theme.ash }]}>· {time}</Text> : null}
          {replyCount != null && replyCount > 0 ? (
            <View style={[styles.replyPill, { backgroundColor: theme.canvasSoft }]}>
              <Text style={[styles.replies, { color: theme.inkSecondary }]}>
                {replyCount} 回复
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    gap: 12,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  author: {
    fontSize: 11.5,
    fontWeight: '500',
    flexShrink: 1,
  },
  time: {
    fontSize: 11.5,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
    marginTop: 2,
    marginBottom: 4,
  },
  excerpt: {
    fontSize: 13,
    lineHeight: 19.5,
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 20,
  },
  replyPill: {
    marginLeft: 'auto',
    borderRadius: 50,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  replies: {
    fontSize: 11,
    fontWeight: '500',
  },
});
