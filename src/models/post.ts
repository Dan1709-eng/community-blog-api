import { Schema, Types, model } from 'mongoose';

export interface IPost {
  title: string;
  content: string;
  author: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
    content: { type: String, required: true, trim: true, minlength: 1, maxlength: 20000 },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

export const Post = model<IPost>('Post', postSchema);