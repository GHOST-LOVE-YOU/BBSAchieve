import { Link } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from './avatar';
import { Pill, PillColor } from './pill';

import { Radius, Spacing } from '@/constants/theme';
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
  boardSlug,
  replyCount,
  time,
  pillColor = 'blue',
  isBot,
}: Props) {
  const theme = useTheme();

  return (
    <Link href={{ pathname: '/threads/[threadId]', params: { threadId } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, { backgroundColor: theme.surface }, pressed && styles.pressed]}>
        <View style={styles.topRow}>
          <Avatar name={authorName} size={28} color={isBot ? theme.surfaceButter : undefined} />
          <Text style={[styles.author, { color: theme.inkSecondary }]} numberOfLines={1}>
            {authorName}
          </Text>
          {time ? <Text style={[styles.time, { color: theme.ash }]}>{time}</Text> : null}
        </View>

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
          {replyCount != null && replyCount > 0 ? (
            <Text style={[styles.replies, { color: theme.ash }]}>
              {replyCount} 回复
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  author: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  time: {
    fontSize: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  excerpt: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 2,
  },
  replies: {
    fontSize: 12,
    marginLeft: 'auto',
  },
});
