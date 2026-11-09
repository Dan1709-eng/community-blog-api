import { Schema, Types, model } from 'mongoose';

export interface IComment {
  content: string;
  post: Types.ObjectId;
  author: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    content: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

// Speeds up "get all comments of a post, oldest first"
commentSchema.index({ post: 1, createdAt: 1 });

export const Comment = model<IComment>('Comment', commentSchema);