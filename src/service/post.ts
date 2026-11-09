import { Comment } from '../models/comment';
import { Post } from '../models/post';
import {
  assertValidObjectId,
  badRequest,
  forbidden,
  notFound,
  parseString,
  requireBodyObject,
} from '../utils/error';

// Only the author's public name is exposed on posts (never their email).
const AUTHOR_FIELDS = 'name';

function parseTitle(value: unknown): string {
  return parseString(value, 'title', 3, 150);
}

function parseContent(value: unknown): string {
  return parseString(value, 'content', 1, 20000);
}

export async function createPost(authorId: string, body: unknown) {
  const input = requireBodyObject(body);
  const title = parseTitle(input.title);
  const content = parseContent(input.content);

  const post = await Post.create({ title, content, author: authorId });
  return post.populate('author', AUTHOR_FIELDS);
}

export async function getAllPosts() {
  return Post.find().sort({ createdAt: -1 }).populate('author', AUTHOR_FIELDS);
}

export async function getPostById(postId: string) {
  assertValidObjectId(postId, 'post ID');

  const post = await Post.findById(postId).populate('author', AUTHOR_FIELDS);
  if (!post) {
    throw notFound('Post not found');
  }
  return post;
}

export async function updatePost(postId: string, userId: string, body: unknown) {
  assertValidObjectId(postId, 'post ID');
  const input = requireBodyObject(body);

  if (input.title === undefined && input.content === undefined) {
    throw badRequest('Provide at least one of: title, content');
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw notFound('Post not found');
  }
  if (post.author.toString() !== userId) {
    throw forbidden('You can only update your own posts');
  }

  if (input.title !== undefined) {
    post.title = parseTitle(input.title);
  }
  if (input.content !== undefined) {
    post.content = parseContent(input.content);
  }

  await post.save();
  return post.populate('author', AUTHOR_FIELDS);
}

export async function deletePost(postId: string, userId: string): Promise<void> {
  assertValidObjectId(postId, 'post ID');

  const post = await Post.findById(postId);
  if (!post) {
    throw notFound('Post not found');
  }
  if (post.author.toString() !== userId) {
    throw forbidden('You can only delete your own posts');
  }

  // Comments cannot exist without their post, so remove them too.
  await Comment.deleteMany({ post: post._id });
  await post.deleteOne();
}