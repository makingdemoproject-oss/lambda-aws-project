#!/usr/bin/env node
/**
 * Mint a long-lived **service token** for autonomous workers (cron Lambdas,
 * agentic-service background runs, etc.) that need to call rbac-protected
 * services without a human user signing in.
 *
 * It's a regular access token — same `iss=rbac, aud=platform` — just with
 * a much longer `expiresIn`. The peer service can't tell it from a normal
 * user token; both go through the same `/auth/verify` round-trip.
 *
 * Usage:
 *
 *   docker compose exec rbac node src/scripts/mint-service-token.js \
 *     --role agent \
 *     --expires 90d \
 *     --name learn-completion-cron
 *
 * Output is the raw JWT — pipe it to your secret store:
 *
 *   ... | aws secretsmanager put-secret-value \
 *           --secret-id /platform/agent_service_token \
 *           --secret-string file:///dev/stdin
 *
 * Important: print the token ONCE; we don't store the raw value anywhere.
 * If you lose it, mint a new one and rotate.
 */
'use strict';

require('dotenv').config();

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User, Role, sequelize } = require('../models');
const config = require('../config');

function arg(name, def) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return def;
  return process.argv[idx + 1];
}

async function main() {
  const roleKey = arg('role',    'agent');
  const expires = arg('expires', '90d');
  const name    = arg('name',    `service-${roleKey}-${new Date().toISOString().slice(0, 10)}`);
  const email   = arg('email',   `${name}@service.internal`);

  // 1. Ensure the service-user row exists (idempotent). We keep it in
  //    rbac.users so /auth/verify can look up roles + permissions in the
  //    same query path as a real user — no special-case code in services.
  const role = await Role.findOne({ where: { key: roleKey } });
  if (!role) {
    console.error(`ERROR: role "${roleKey}" not found in rbac.roles. Seed it first.`);
    process.exit(1);
  }

  let user = await User.findOne({ where: { email } });
  if (!user) {
    user = await User.create({
      firstName: 'Service',
      lastName: name,
      email,
      password: crypto.randomBytes(48).toString('hex'),   // unusable — service users never log in
      isActive: true,
      emailVerifiedAt: new Date(),                        // pre-verified so requireVerifiedEmail passes
    });
    await user.addRole(role);
    console.error(`[mint] created service user ${email} with role ${roleKey}`);
  } else {
    console.error(`[mint] reusing existing service user ${email}`);
  }

  // 2. Sign with the SAME issuer/audience as a normal access token, just
  //    with a much longer TTL. Peer services and the API Gateway authorizer
  //    accept it identically.
  const token = jwt.sign(
    { sub: user.id, email: user.email, typ: 'service', name },
    config.jwt.accessSecret,
    { issuer: 'rbac', audience: 'platform', expiresIn: expires },
  );

  // 3. Emit to stdout. Caller pipes to Secrets Manager / Vault / wherever.
  //    Diagnostics go to stderr so they don't pollute the token.
  console.error(`[mint] ok: role=${roleKey}, expires=${expires}, sub=${user.id}`);
  process.stdout.write(token + '\n');

  await sequelize.close();
}

main().catch((err) => {
  console.error(`[mint] failed: ${err.message}`);
  process.exit(1);
});
