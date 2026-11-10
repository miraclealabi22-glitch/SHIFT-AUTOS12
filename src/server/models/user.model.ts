import "server-only";

import { model, models, Schema, type Types } from "mongoose";

export type UserDocument = {
  _id: Types.ObjectId;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  roles: string[];
  sessionTokenHash?: string | null;
  sessionExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserDocument>({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  username: { type: String, required: true, trim: true, lowercase: true, minlength: 3, maxlength: 40 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 255 },
  passwordHash: { type: String, required: true, maxlength: 255 },
  roles: { type: [String], default: ["user"], validate: (roles: string[]) => roles.length > 0 },
  sessionTokenHash: { type: String, default: null, maxlength: 128 },
  sessionExpiresAt: { type: Date, default: null },
}, {
  timestamps: true,
  strict: "throw",
  versionKey: false,
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ sessionTokenHash: 1, sessionExpiresAt: 1 });

export const UserModel = models.User ?? model<UserDocument>("User", userSchema);
