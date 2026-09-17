import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';

// The signing keys are read at call time, so setting them here is enough.
process.env.JWT_SECRET = 'a'.repeat(64);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);

// jest.Mock's call list is `any[]`, so reading an argument out of it is an
// unsafe access everywhere it happens. One typed helper instead of a cast at
// each site.
function argOf<T>(mock: jest.Mock, call = 0, index = 0): T {
  return mock.mock.calls[call][index] as T;
}

type Repo = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

function repo(): Repo {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((value: unknown) => value),
    save: jest.fn((value: unknown) => Promise.resolve(value)),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };
}

function userLike(overrides: Partial<User> = {}): User {
  return {
    id: 7,
    email: 'buyer@example.test',
    passwordHash: bcrypt.hashSync('correct horse', 4),
    firstName: 'Оля',
    lastName: 'Мельник',
    phone: '+380501112233',
    role: UserRole.USER,
    isActive: true,
    telegramChatId: null,
    ...overrides,
  } as User;
}

function build(user: User | null) {
  const users = {
    findByEmail: jest.fn().mockResolvedValue(user),
    findById: jest.fn().mockResolvedValue(user),
    create: jest.fn().mockResolvedValue(user ?? userLike()),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const mail = { sendPasswordReset: jest.fn().mockResolvedValue(undefined) };
  const sessions = repo();
  const resets = repo();

  const service = new AuthService(
    users as never,
    new JwtService({ secret: process.env.JWT_SECRET }),
    mail as never,
    sessions as never,
    resets as never,
  );

  return { service, users, mail, sessions, resets };
}

describe('AuthService.login', () => {
  it('signs in with the right password and records the device', async () => {
    const { service, sessions } = build(userLike());

    const result = await service.login(
      { email: 'buyer@example.test', password: 'correct horse' },
      'Firefox on a laptop',
    );

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.user.email).toBe('buyer@example.test');
    expect(sessions.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        // Never the token itself.
        tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        userAgent: 'Firefox on a laptop',
      }),
    );
  });

  it('rejects the wrong password', async () => {
    const { service } = build(userLike());

    await expect(
      service.login({ email: 'buyer@example.test', password: 'wrong' }),
    ).rejects.toThrow('Невірний email або пароль');
  });

  // A missing account and a wrong password say exactly the same thing, so the
  // route can't be used to find out who shops here.
  it('says the same thing about an address that does not exist', async () => {
    const { service } = build(null);

    await expect(
      service.login({ email: 'nobody@example.test', password: 'whatever' }),
    ).rejects.toThrow('Невірний email або пароль');
  });

  // The column existed and was shown in the admin list while nothing anywhere
  // read it — a switch that did nothing.
  it('refuses a deactivated account', async () => {
    const { service } = build(userLike({ isActive: false }));

    await expect(
      service.login({ email: 'buyer@example.test', password: 'correct horse' }),
    ).rejects.toThrow(/призупинено/);
  });

  it('is not case-sensitive about the address', async () => {
    const { service, users } = build(userLike());

    await service.login({
      email: '  Buyer@Example.Test ',
      password: 'correct horse',
    });

    expect(users.findByEmail).toHaveBeenCalledWith('buyer@example.test');
  });
});

describe('AuthService.register', () => {
  it('turns a lost race on the unique email index into a 400', async () => {
    const { service, users } = build(null);
    users.create.mockRejectedValue(
      Object.assign(new Error('duplicate'), {
        driverError: { code: 'ER_DUP_ENTRY' },
      }),
    );

    await expect(
      service.register({
        email: 'buyer@example.test',
        password: 'a-good-password',
        firstName: 'Оля',
        lastName: 'Мельник',
        phone: '+380501112233',
      }),
    ).rejects.toThrow('Користувач з таким email вже існує');
  });
});

describe('AuthService.refresh', () => {
  async function tokenFor(service: AuthService, sessions: Repo) {
    const { refreshToken } = await service.login({
      email: 'buyer@example.test',
      password: 'correct horse',
    });

    return {
      refreshToken,
      hash: argOf<{ tokenHash: string }>(sessions.save).tokenHash,
    };
  }

  it('rotates the session and hands back a new pair', async () => {
    const { service, sessions } = build(userLike());
    const { refreshToken, hash } = await tokenFor(service, sessions);

    sessions.findOne.mockResolvedValue({
      id: 1,
      userId: 7,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await service.refresh(refreshToken);

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).not.toEqual(refreshToken);
    expect(sessions.update).toHaveBeenCalledWith(
      { id: 1, tokenHash: hash },
      expect.objectContaining({ tokenHash: expect.any(String) }),
    );
  });

  // A token that verifies but holds no session was already rotated away —
  // either a replay or a stolen token that has been used. Both end every
  // session on the account.
  it('revokes every session when a rotated token is presented again', async () => {
    const { service, sessions } = build(userLike());
    const { refreshToken } = await tokenFor(service, sessions);

    sessions.findOne.mockResolvedValue(null);

    await expect(service.refresh(refreshToken)).rejects.toThrow(
      'Invalid refresh token',
    );
    expect(sessions.delete).toHaveBeenCalledWith({ userId: 7 });
  });

  it('refuses a session whose row has expired', async () => {
    const { service, sessions } = build(userLike());
    const { refreshToken, hash } = await tokenFor(service, sessions);

    sessions.findOne.mockResolvedValue({
      id: 1,
      userId: 7,
      tokenHash: hash,
      expiresAt: new Date(Date.now() - 1),
    });

    await expect(service.refresh(refreshToken)).rejects.toThrow(
      'Invalid refresh token',
    );
    expect(sessions.delete).toHaveBeenCalledWith({ id: 1 });
  });

  it('refuses garbage without reaching the database', async () => {
    const { service, sessions } = build(userLike());

    await expect(service.refresh('not-a-jwt')).rejects.toThrow(
      'Invalid refresh token',
    );
    expect(sessions.findOne).not.toHaveBeenCalled();
  });

  it('refuses a missing token', async () => {
    const { service } = build(userLike());

    await expect(service.refresh(undefined)).rejects.toThrow(
      'Invalid refresh token',
    );
  });
});

describe('AuthService password reset', () => {
  it('says the same thing whether or not the address exists', async () => {
    const known = build(userLike());
    const unknown = build(null);

    const a = await known.service.requestPasswordReset('buyer@example.test');
    const b = await unknown.service.requestPasswordReset('nobody@example.test');

    expect(a).toEqual(b);
    expect(known.mail.sendPasswordReset).toHaveBeenCalled();
    expect(unknown.mail.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('stores only a hash of the token, and puts the token in the link', async () => {
    const { service, resets, mail } = build(userLike());

    await service.requestPasswordReset('buyer@example.test');

    const stored = argOf<{ tokenHash: string }>(resets.save);
    const link = argOf<string>(mail.sendPasswordReset, 0, 2);

    expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(link).not.toContain(stored.tokenHash);
    expect(link).toContain('token=');
  });

  it('refuses a token that has already been used', async () => {
    const { service, resets } = build(userLike());
    resets.findOne.mockResolvedValue({
      id: 1,
      userId: 7,
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      service.resetPassword('f'.repeat(64), 'new-password'),
    ).rejects.toThrow(/недійсне або застаріло/);
  });

  it('refuses an expired token', async () => {
    const { service, resets } = build(userLike());
    resets.findOne.mockResolvedValue({
      id: 1,
      userId: 7,
      usedAt: null,
      expiresAt: new Date(Date.now() - 1),
    });

    await expect(
      service.resetPassword('f'.repeat(64), 'new-password'),
    ).rejects.toThrow(/недійсне або застаріло/);
  });

  // Whoever sets the password owns the account, and anyone already signed in
  // may be exactly the reason the reset happened.
  it('ends every session and spends the token on success', async () => {
    const { service, resets, sessions, users } = build(userLike());
    resets.findOne.mockResolvedValue({
      id: 1,
      userId: 7,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await service.resetPassword('f'.repeat(64), 'a-brand-new-password');

    expect(users.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ passwordHash: expect.any(String) }),
    );
    expect(resets.update).toHaveBeenCalledWith(
      { id: 1 },
      expect.objectContaining({ usedAt: expect.any(Date) }),
    );
    expect(sessions.delete).toHaveBeenCalledWith({ userId: 7 });
  });
});

describe('AuthService.changePassword', () => {
  it('requires the current password', async () => {
    const { service } = build(userLike());

    await expect(
      service.changePassword(7, 'not the current one', 'a-new-password'),
    ).rejects.toThrow('Поточний пароль невірний');
  });

  it('keeps this device signed in and ends the others', async () => {
    const { service, sessions } = build(userLike());
    sessions.find.mockResolvedValue([
      { id: 1, tokenHash: 'keep-me' },
      { id: 2, tokenHash: 'end-me' },
    ]);

    // changePassword hashes the token it is given; feed it one whose hash we
    // can predict by reading what the first session claims to be.
    await service.changePassword(7, 'correct horse', 'a-new-password');

    expect(sessions.delete).toHaveBeenCalledWith({ id: 1 });
    expect(sessions.delete).toHaveBeenCalledWith({ id: 2 });
  });
});
