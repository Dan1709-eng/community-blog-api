import { Comment } from '../models/comment';
import { Post } from '../models/post';
import {
  assertValidObjectId,
  forbidden,
  notFound,
  parseString,
  requireBodyObject,
} from '../utils/error';

// Only the author's public name is exposed on comments (never their email).
const AUTHOR_FIELDS = 'name';

function parseContent(value: unknown): string {
  return parseString(value, 'content', 1, 2000);
}

async function ensurePostExists(postId: string): Promise<void> {
  assertValidObjectId(postId, 'post ID');

  const postExists = await Post.exists({ _id: postId });
  if (!postExists) {
    throw notFound('Post not found');
  }
}

export async function createComment(postId: string, authorId: string, body: unknown) {
  await ensurePostExists(postId);
  const input = requireBodyObject(body);
  const content = parseContent(input.content);

  const comment = await Comment.create({ content, post: postId, author: authorId });
  return comment.populate('author', AUTHOR_FIELDS);
}

export async function getCommentsByPost(postId: string) {
  await ensurePostExists(postId);

  return Comment.find({ post: postId }).sort({ createdAt: 1 }).populate('author', AUTHOR_FIELDS);
}

export async function getCommentById(commentId: string) {
  assertValidObjectId(commentId, 'comment ID');

  const comment = await Comment.findById(commentId).populate('author', AUTHOR_FIELDS);
  if (!comment) {
    throw notFound('Comment not found');
  }
  return comment;
}

export async function updateComment(commentId: string, userId: string, body: unknown) {
  assertValidObjectId(commentId, 'comment ID');
  const input = requireBodyObject(body);
  const content = parseContent(input.content);

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw notFound('Comment not found');
  }
  if (comment.author.toString() !== userId) {
    throw forbidden('You can only update your own comments');
  }

  comment.content = content;
  await comment.save();
  return comment.populate('author', AUTHOR_FIELDS);
}

export async function deleteComment(commentId: string, userId: string): Promise<void> {
  assertValidObjectId(commentId, 'comment ID');

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw notFound('Comment not found');
  }
  if (comment.author.toString() !== userId) {
    throw forbidden('You can only delete your own comments');
  }

  await comment.deleteOne();
}