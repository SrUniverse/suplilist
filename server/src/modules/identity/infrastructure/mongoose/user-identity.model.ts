import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { UserStatus, UserRole } from '../../domain/user-identity.entity.js';

export interface IOAuthProviderDocument {
  provider: 'google';
  providerId: string;
  providerEmail?: string;
  linkedAt: Date;
}

export interface IMfaInfoDocument {
  enabled: boolean;
  type: 'totp' | null;
  totpSecret: string | null;
  tempSecret: string | null;
  backupCodes: string[];
  enabledAt: Date | null;
  lastUsedAt: Date | null;
}

export interface IUserIdentityDocument extends Document {
  email: string;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  passwordHash: string | null;
  providers: IOAuthProviderDocument[];
  mfa: IMfaInfoDocument;
  status: UserStatus;
  role: UserRole;
  deletedAt: Date | null;
  suspendedAt: Date | null;
  suspendedReason: string | null;
  trustedDevices: string[];
  sessionsValidAfter: Date | null;
  
  passwordReset: {
    tokenHash: string | null;
    expiresAt: Date | null;
  };
  
  // Controle de Infraestrutura (Expurgo)
  purgeAttempts: number;
  purgeFailed: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const oauthProviderSchema = new Schema<IOAuthProviderDocument>({
  provider: {
    type: String,
    required: true,
    enum: ['google'],
  },
  providerId: {
    type: String,
    required: true,
  },
  providerEmail: {
    type: String,
    lowercase: true,
    trim: true,
  },
  linkedAt: {
    type: Date,
    default: Date.now,
  }
}, { _id: false });

const userIdentitySchema = new Schema<IUserIdentityDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerifiedAt: {
    type: Date,
    default: null,
  },
  passwordHash: {
    type: String,
    default: null,
  },
  providers: [oauthProviderSchema],
  mfa: {
    enabled: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ['totp', null],
      default: null,
    },
    totpSecret: {
      type: String,
      default: null,
    },
    tempSecret: {
      type: String,
      default: null,
    },
    backupCodes: {
      type: [String],
      default: [],
    },
    enabledAt: {
      type: Date,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    }
  },
  status: {
    type: String,
    enum: ['active', 'pending_verification', 'suspended', 'deleted'],
    default: 'pending_verification',
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user',
    required: true,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  suspendedAt: {
    type: Date,
    default: null,
  },
  suspendedReason: {
    type: String,
    default: null,
  },
  trustedDevices: {
    type: [String],
    default: [],
  },
  sessionsValidAfter: {
    type: Date,
    default: null,
  },
  passwordReset: {
    tokenHash: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    }
  },
  purgeAttempts: {
    type: Number,
    default: 0,
  },
  purgeFailed: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
  collection: 'users_identity'
});

// Índices
userIdentitySchema.index({ email: 1 }, { unique: true });
userIdentitySchema.index(
  { 'providers.providerId': 1, 'providers.provider': 1 },
  { 
    unique: true, 
    sparse: true 
  }
);

// Índice composto otimizado estritamente para o loop de paginação do Purge Job
userIdentitySchema.index({ status: 1, deletedAt: 1, purgeFailed: 1, _id: 1 });

// Índice para otimização da busca de redefinição de senha (e expiração nativa)
userIdentitySchema.index({ 'passwordReset.tokenHash': 1, 'passwordReset.expiresAt': 1 });



export const UserIdentityModel = mongoose.model<IUserIdentityDocument>('UserIdentity', userIdentitySchema);
export default UserIdentityModel;

