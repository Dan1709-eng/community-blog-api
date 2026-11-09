import { Schema, model } from 'mongoose';

export interface IUser {
  name: string;
  email: string;
  password: string; // bcrypt hash, never the plain-text password
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true, // creates a unique index in MongoDB
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // select: false -> the hash is NOT returned by queries unless explicitly requested
    password: { type: String, required: true, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      // Second safety net: the hash is removed whenever a user is turned into JSON.
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.password;
        return ret;
      },
    },
  },
);

export const User = model<IUser>('User', userSchema);