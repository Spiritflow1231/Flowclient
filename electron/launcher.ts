import { app, safeStorage, shell, type WebContents } from 'electron';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import type { LauncherSettings, MinecraftProfile, MicrosoftAccount } from './launcher-types';

const execFileAsync = promisify(execFile);
const microsoftClientId = '00000000402b5328';
const microsoftDeviceCodeUrl = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode';
const microsoftTokenUrl = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
const versionManifestUrl = 'https://launchermeta.mojang.com/mc/game/version_manifest.json';
const fabricMetaUrl = 'https://meta.fabricmc.net/v2/versions/loader';

interface MicrosoftTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  xuid: string;
}

interface VersionManifest {
  versions: Array<{ id: string; type: string; url: string }>;
}

interface MinecraftVersionMetadata {
  id: string;
  type: string;
  arguments?: { jvm?: JvmArgumentEntry[] };
  javaVersion?: { majorVersion: number };
  assetIndex?: { id: string };
  logging?: {
    client?: {
      argument: string;
      file: { id: string; url: string; sha1: string; size: number };
    };
  };
}

interface JvmArgumentEntry {
  rules?: Array<{
    action: 'allow' | 'disallow';
    os?: { name?: string; arch?: string; version?: string };
    features?: Record<string, boolean>;
  }>;
  value: string | string[];
}

interface LauncherEvent {
  phase: LauncherPhase;
  message: string;
  error?: boolean;
  profileId?: string | null;
  processId?: number | null;
}

interface MicrosoftOAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface XboxAuthResponse {
  Token: string;
  DisplayClaims: { xui: Array<{ uhs: string; xid?: string }> };
}

interface MinecraftAuthResponse {
  access_token: string;
  expires_in: number;
  xuid: string;
}

interface MinecraftProfileResponse {
  id: string;
  name: string;
}

interface MinecraftLauncherOptions {
  authorization: {
    access_token: string;
    client_token: string;
    uuid: string;
    name: string;
    user_properties: string;
    meta: { type: string; xuid: string; clientId: string };
  };
  root: string;
  version: { number: string; type: string; custom?: string };
  memory: { min: string; max: string };
  javaPath: string;
  customArgs: string[];
  overrides: { gameDirectory: string; cwd: string; detached: boolean };
}

interface MinecraftLauncherClient {
  on(event: string, listener: (...args: unknown[]) => void): this;
  launch(options: MinecraftLauncherOptions): Promise<ChildProcess | null>;
}

interface JavaInstallation {
  path: string;
  version: number;
}

type LauncherPhase = 'ready' | 'authenticating' | 'downloading' | 'preparing' | 'launching' | 'running' | 'error';

interface FabricProfile {
  id: string;
  inheritsFrom: string;
  [key: string]: unknown;
}

interface FabricLoaderVersion {
  loader: { version: string; stable: boolean };
}

class ServiceError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

let activeProcess: ChildProcess | null = null;
let launchInProgress = false;
let launcherClientConstructor: new () => MinecraftLauncherClient;
let tokenStoreQueue: Promise<void> = Promise.resolve();

function getLauncherClientConstructor(): new () => MinecraftLauncherClient {
  if (!launcherClientConstructor) {
    launcherClientConstructor = (require('minecraft-launcher-core') as { Client: new () => MinecraftLauncherClient }).Client;
  }
  return launcherClientConstructor;
}

function emit(contents: WebContents, event: LauncherEvent): void {
  if (!contents.isDestroyed()) contents.send('launcher:event', event);
}

function expandPath(value: string): string {
  const expanded = value.trim().replace(/^~(?=$|[\\/])/, os.homedir());
  return path.resolve(expanded);
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(30_000) });
  const body = await response.text();
  let parsed: unknown;
  try {
    parsed = body ? JSON.parse(body) as unknown : {};
  } catch {
    throw new Error(`The service returned an invalid response (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    const payload = parsed as { error?: string; error_description?: string; message?: string };
    throw new ServiceError(payload.error_description ?? payload.message ?? payload.error ?? `The service returned HTTP ${response.status}.`, payload.error);
  }
  return parsed as T;
}

function formBody(values: Record<string, string>): URLSearchParams {
  return new URLSearchParams(values);
}

function safeTokenFile(): string {
  return path.join(app.getPath('userData'), 'microsoft-accounts.enc');
}

async function readTokenStore(): Promise<Record<string, MicrosoftTokens>> {
  if (!isSecureStorageAvailable()) {
    throw new Error('Secure token storage is unavailable. Sign in after enabling your operating system keychain.');
  }
  try {
    const encrypted = await fs.readFile(safeTokenFile());
    return JSON.parse(safeStorage.decryptString(encrypted)) as Record<string, MicrosoftTokens>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw new Error(`Could not read encrypted Microsoft account storage: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function writeTokenStore(store: Record<string, MicrosoftTokens>): Promise<void> {
  if (!isSecureStorageAvailable()) {
    throw new Error('Secure token storage is unavailable. Microsoft tokens were not saved.');
  }
  const encrypted = safeStorage.encryptString(JSON.stringify(store));
  await fs.mkdir(path.dirname(safeTokenFile()), { recursive: true });
  const file = safeTokenFile();
  const temporary = `${file}.tmp`;
  await fs.writeFile(temporary, encrypted, { mode: 0o600 });
  await fs.rename(temporary, file);
}

function isSecureStorageAvailable(): boolean {
  if (!safeStorage.isEncryptionAvailable()) return false;
  return process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text';
}

async function updateTokenStore<T>(update: (store: Record<string, MicrosoftTokens>) => Promise<T> | T): Promise<T> {
  const operation = tokenStoreQueue.then(async () => {
    const store = await readTokenStore();
    const result = await update(store);
    await writeTokenStore(store);
    return result;
  });
  tokenStoreQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

async function microsoftTokenRequest(values: Record<string, string>): Promise<MicrosoftOAuthResponse> {
  return requestJson<MicrosoftOAuthResponse>(microsoftTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({ client_id: microsoftClientId, ...values }),
  });
}

async function minecraftAccessToken(microsoftAccessToken: string): Promise<MinecraftAuthResponse> {
  const xbox = await requestJson<XboxAuthResponse>('https://user.auth.xboxlive.com/user/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: `d=${microsoftAccessToken}`,
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT',
    }),
  });
  const xsts = await requestJson<XboxAuthResponse>('https://xsts.auth.xboxlive.com/xsts/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      Properties: { SandboxId: 'RETAIL', UserTokens: [xbox.Token] },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT',
    }),
  });
  const user = xsts.DisplayClaims.xui[0];
  const userHash = user?.uhs;
  if (!userHash) throw new Error('Microsoft did not return an Xbox user identity for this account.');
  const token = await requestJson<Omit<MinecraftAuthResponse, 'xuid'>>('https://api.minecraftservices.com/authentication/login_with_xbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identityToken: `XBL3.0 x=${userHash};${xsts.Token}` }),
  });
  return { ...token, xuid: user.xid ?? userHash };
}

async function finishMicrosoftSignIn(oauth: MicrosoftOAuthResponse): Promise<{ account: MicrosoftAccount; tokens: MicrosoftTokens }> {
  const minecraftToken = await minecraftAccessToken(oauth.access_token);
  const minecraftHeaders = { Authorization: `Bearer ${minecraftToken.access_token}` };
  const [profile, entitlements] = await Promise.all([
    requestJson<MinecraftProfileResponse>('https://api.minecraftservices.com/minecraft/profile', { headers: minecraftHeaders }),
    requestJson<{ items?: Array<{ name: string }> }>('https://api.minecraftservices.com/entitlements/mcstore', { headers: minecraftHeaders }),
  ]);
  if (!entitlements.items?.some((item) => item.name === 'game_minecraft')) {
    throw new Error('This Microsoft account does not have a Minecraft Java Edition entitlement.');
  }
  const now = new Date().toISOString();
  const account: MicrosoftAccount = {
    id: profile.id,
    name: profile.name,
    uuid: profile.id,
    createdAt: now,
  };
  return {
    account,
    tokens: {
      accessToken: minecraftToken.access_token,
      refreshToken: oauth.refresh_token,
      expiresAt: Date.now() + Math.min(oauth.expires_in, minecraftToken.expires_in) * 1000,
      xuid: minecraftToken.xuid,
    },
  };
}

export async function connectMicrosoftAccount(contents: WebContents): Promise<MicrosoftAccount> {
  if (!isSecureStorageAvailable()) {
    throw new Error('Secure token storage is unavailable. Configure an operating system keychain before signing in.');
  }
  const device = await requestJson<DeviceCodeResponse>(microsoftDeviceCodeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({ client_id: microsoftClientId, scope: 'XboxLive.signin offline_access' }),
  });
  emit(contents, { phase: 'authenticating', message: `Enter code ${device.user_code} at ${device.verification_uri}.` });
  await shell.openExternal('https://www.microsoft.com/link');
  const deadline = Date.now() + device.expires_in * 1000;
  let interval = Math.max(1, device.interval);
  let oauth: MicrosoftOAuthResponse | undefined;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));
    try {
      oauth = await microsoftTokenRequest({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: device.device_code,
      });
      break;
    } catch (error) {
      const code = error instanceof ServiceError ? error.code : undefined;
      if (code === 'authorization_pending') continue;
      if (code === 'slow_down') {
        interval += 5;
        continue;
      }
      if (code === 'authorization_declined') throw new Error('Microsoft sign-in was declined.');
      if (code === 'expired_token') throw new Error('The Microsoft sign-in code expired. Try connecting again.');
      throw error;
    }
  }
  if (!oauth) throw new Error('The Microsoft sign-in code expired. Try connecting again.');

  const { account, tokens } = await finishMicrosoftSignIn(oauth);
  await updateTokenStore((store) => { store[account.id] = tokens; });
  return account;
}

export async function removeMicrosoftAccount(accountId: string): Promise<void> {
  await updateTokenStore((store) => { delete store[accountId]; });
}

async function refreshMicrosoftAccount(accountId: string): Promise<MicrosoftTokens> {
  const store = await readTokenStore();
  const stored = store[accountId];
  if (!stored) throw new Error('The selected Microsoft account is no longer connected. Connect it again in Accounts.');
  if (stored.expiresAt > Date.now() + 60_000) return stored;

  const oauth = await microsoftTokenRequest({
    grant_type: 'refresh_token',
    refresh_token: stored.refreshToken,
    scope: 'XboxLive.signin offline_access',
  });
  const refreshed = await finishMicrosoftSignIn(oauth);
  if (refreshed.account.id !== accountId) {
    throw new Error('Microsoft returned a different account during token refresh. Connect the intended account again.');
  }
  await updateTokenStore((current) => {
    if (!current[accountId]) throw new Error('The Microsoft account was disconnected while its token was refreshing.');
    current[accountId] = refreshed.tokens;
  });
  return refreshed.tokens;
}

async function getVersionManifest(): Promise<VersionManifest> {
  return requestJson<VersionManifest>(versionManifestUrl);
}

export async function getMinecraftVersions(): Promise<string[]> {
  const manifest = await getVersionManifest();
  return manifest.versions.filter((version) => version.type === 'release').map((version) => version.id);
}

function javaVersionFromOutput(output: string): number | null {
  const match = output.match(/version\s+"([^"]+)"/i) ?? output.match(/openjdk\s+(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const raw = match[1];
  const parsed = raw.startsWith('1.') ? Number.parseInt(raw.split('.')[1], 10) : Number.parseInt(raw.split('.')[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function inspectJava(binary: string): Promise<JavaInstallation | null> {
  try {
    const { stdout, stderr } = await execFileAsync(binary, ['-version'], { timeout: 5000 });
    const version = javaVersionFromOutput(`${stderr}\n${stdout}`);
    return version ? { path: binary, version } : null;
  } catch (error) {
    const output = error as { stdout?: string; stderr?: string };
    const version = javaVersionFromOutput(`${output.stderr ?? ''}\n${output.stdout ?? ''}`);
    return version ? { path: binary, version } : null;
  }
}

async function javaCandidates(): Promise<string[]> {
  const executable = process.platform === 'win32' ? 'where.exe' : 'which';
  const javaName = process.platform === 'win32' ? 'java.exe' : 'java';
  const candidates = new Set<string>();
  if (process.env.JAVA_HOME) candidates.add(path.join(process.env.JAVA_HOME, 'bin', javaName));
  candidates.add('java');
  try {
    const { stdout } = await execFileAsync(executable, ['java'], { timeout: 5000 });
    for (const candidate of stdout.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)) candidates.add(candidate);
  } catch {
    // A missing PATH entry is reported as an empty detection result.
  }

  const commonDirectories = process.platform === 'win32'
    ? [
      path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Java'),
      path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Eclipse Adoptium'),
      path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Microsoft'),
    ]
    : process.platform === 'darwin'
      ? ['/Library/Java/JavaVirtualMachines']
      : ['/usr/lib/jvm', '/usr/java'];
  for (const directory of commonDirectories) {
    try {
      for (const entry of await fs.readdir(directory)) {
        if (process.platform === 'darwin') candidates.add(path.join(directory, entry, 'Contents', 'Home', 'bin', javaName));
        else candidates.add(path.join(directory, entry, 'bin', javaName));
      }
    } catch {
      continue;
    }
  }
  return [...candidates];
}

export async function detectJava(): Promise<JavaInstallation[]> {
  const installed: JavaInstallation[] = [];
  for (const candidate of await javaCandidates()) {
    const result = await inspectJava(candidate);
    if (result && !installed.some((item) => item.path === result.path)) installed.push(result);
  }
  return installed.sort((left, right) => right.version - left.version);
}

function splitArguments(value: string): string[] {
  const args: string[] = [];
  const matcher = /"([^"]*)"|'([^']*)'|(\S+)/g;
  for (const match of value.matchAll(matcher)) args.push(match[1] ?? match[2] ?? match[3]);
  return args;
}

function isJvmRuleMatched(
  rule: NonNullable<JvmArgumentEntry['rules']>[number],
  features: Record<string, boolean>,
): boolean {
  if (rule.os?.name) {
    const currentOs = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
    if (rule.os.name !== currentOs) return false;
  }
  if (rule.os?.arch) {
    const currentArch = process.arch === 'ia32' ? 'x86' : process.arch === 'x64' ? 'x86_64' : process.arch;
    if (rule.os.arch !== currentArch) return false;
  }
  if (rule.os?.version && !new RegExp(rule.os.version).test(os.release())) return false;
  if (rule.features && Object.entries(rule.features).some(([name, expected]) => (features[name] ?? false) !== expected)) return false;
  return true;
}

function prepareJvmArguments(
  entries: JvmArgumentEntry[],
  launchArguments: string[],
  root: string,
  version: string,
): void {
  const separator = process.platform === 'win32' ? ';' : ':';
  const nativesDirectory = Number(version.split('.')[1]) >= 19
    ? root
    : path.join(root, 'natives', version);
  const replacements: Record<string, string> = {
    '${natives_directory}': nativesDirectory,
    '${launcher_name}': 'FlowClient',
    '${launcher_version}': app.getVersion(),
    '${classpath_separator}': separator,
    '${library_directory}': path.join(root, 'libraries'),
    '${version_name}': version,
  };
  const existingProperties = new Set(
    launchArguments
      .filter((argument) => argument.startsWith('-D') && argument.includes('='))
      .map((argument) => argument.slice(2, argument.indexOf('='))),
  );
  const existingArguments = new Set(launchArguments);
  const features: Record<string, boolean> = {};
  const resolved: string[] = [];

  for (const entry of entries) {
    if (!entry || (typeof entry.value !== 'string' && !Array.isArray(entry.value))) {
      throw new Error('Minecraft provided an invalid JVM argument entry.');
    }
    let allowed = !entry.rules?.length;
    for (const rule of entry.rules ?? []) {
      if (!isJvmRuleMatched(rule, features)) continue;
      allowed = rule.action === 'allow';
    }
    if (!allowed) continue;

    const values = typeof entry.value === 'string' ? [entry.value] : entry.value;
    for (const value of values) {
      if (value === '-cp' || value === '-classpath' || value === '--class-path' || value === '${classpath}') continue;
      if (value.startsWith('-D') && value.includes('=')) {
        const property = value.slice(2, value.indexOf('='));
        if (existingProperties.has(property)) continue;
        existingProperties.add(property);
      }
      if (/^-Xm[sx]/i.test(value) || existingArguments.has(value)) continue;

      const resolvedValue = value.replace(/\$\{[^}]+\}/g, (placeholder) => {
        const replacement = replacements[placeholder];
        if (!replacement) {
          throw new Error(`Minecraft requires unsupported JVM argument placeholder ${placeholder}.`);
        }
        return replacement;
      });
      resolved.push(resolvedValue);
      existingArguments.add(resolvedValue);
    }
  }

  const classpathIndex = launchArguments.findIndex((argument) => argument === '-cp' || argument === '-classpath' || argument === '--class-path');
  if (classpathIndex < 0) throw new Error('The Minecraft launch arguments did not include a class path.');
  launchArguments.splice(classpathIndex, 0, ...resolved);
}

function redact(message: string, secrets: string[]): string {
  return secrets.reduce((result, secret) => secret ? result.split(secret).join('[redacted]') : result, message);
}

async function prepareItems(
  items: MinecraftProfile['mods'],
  gameDirectory: string,
  destination: 'mods' | 'resourcepacks' | 'shaderpacks',
): Promise<void> {
  const enabled = items.filter((item) => item.enabled);
  if (!enabled.length) return;
  const destinationPath = path.join(gameDirectory, destination);
  await fs.mkdir(destinationPath, { recursive: true });
  for (const item of enabled) {
    if (!item.filePath) throw new Error(`The enabled ${destination} item “${item.name}” has no local file selected.`);
    const source = expandPath(item.filePath);
    const extension = path.extname(source).toLowerCase();
    if (destination === 'mods' && extension !== '.jar') {
      throw new Error(`Fabric mod “${item.name}” must be a Java archive (.jar) file.`);
    }
    if (destination !== 'mods' && extension !== '.zip') {
      throw new Error(`${destination === 'resourcepacks' ? 'Resource pack' : 'Shader pack'} “${item.name}” must be a .zip file.`);
    }
    const stat = await fs.stat(source).catch(() => null);
    if (!stat?.isFile()) throw new Error(`The file for “${item.name}” could not be found: ${source}`);
    const target = path.join(destinationPath, path.basename(source));
    if (source !== target) await fs.copyFile(source, target);
  }
}

async function prepareLoggingConfig(
  metadata: MinecraftVersionMetadata,
  root: string,
  report: (event: LauncherEvent) => void,
): Promise<string | null> {
  const logging = metadata.logging?.client;
  if (!logging) return null;
  const { id, url, sha1, size } = logging.file;
  if (!id || id.includes('/') || id.includes('\\') || path.basename(id) !== id || !/^https:\/\//i.test(url) || !/^[a-f0-9]{40}$/i.test(sha1) || !Number.isSafeInteger(size) || size <= 0) {
    throw new Error('Minecraft provided invalid logging configuration metadata.');
  }
  const directory = path.join(root, 'assets', 'log_configs');
  const file = path.join(directory, id);
  try {
    const existing = await fs.readFile(file);
    if (existing.length === size && createHash('sha1').update(existing).digest('hex') === sha1.toLowerCase()) return file;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  report({ phase: 'downloading', message: `Downloading Minecraft logging configuration ${id}…` });
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Could not download Minecraft logging configuration (HTTP ${response.status}).`);
  const content = Buffer.from(await response.arrayBuffer());
  if (content.length !== size || createHash('sha1').update(content).digest('hex') !== sha1.toLowerCase()) {
    throw new Error(`Minecraft logging configuration ${id} failed its integrity check.`);
  }
  await fs.mkdir(directory, { recursive: true });
  const temporary = `${file}.tmp`;
  await fs.writeFile(temporary, content);
  await fs.rename(temporary, file);
  return file;
}

function getProfileDirectory(profile: MinecraftProfile, settings: LauncherSettings): string {
  return expandPath(profile.gameDirectory || path.join(expandPath(settings.launcherDirectory), 'profiles', profile.id, 'game'));
}

function containsPath(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export async function launchMinecraft(
  contents: WebContents,
  profile: MinecraftProfile,
  accountId: string | null,
  settings: LauncherSettings,
  profiles: MinecraftProfile[],
): Promise<void> {
  if (launchInProgress || activeProcess) throw new Error('Minecraft is already starting or running.');
  launchInProgress = true;
  const secrets: string[] = [];
  const report = (event: LauncherEvent) => emit(contents, { ...event, profileId: event.profileId ?? profile.id });

  try {
    report({ phase: 'authenticating', message: 'Validating the selected Microsoft account…' });
    const selectedAccountId = profile.microsoftAccountId || accountId;
    if (!selectedAccountId) throw new Error('Connect and select a Microsoft account in Accounts before launching Minecraft.');
    const token = await refreshMicrosoftAccount(selectedAccountId);
    secrets.push(token.accessToken, token.refreshToken);

    if (!profile.minecraftVersion.trim()) throw new Error('Select a Minecraft version for this profile.');
    const manifest = await getVersionManifest();
    const selectedVersion = manifest.versions.find((version) => version.id === profile.minecraftVersion && version.type === 'release');
    if (!selectedVersion) throw new Error(`Minecraft ${profile.minecraftVersion} is not a published release version.`);

    report({ phase: 'preparing', message: `Validating Minecraft ${profile.minecraftVersion} and profile settings…` });
    const metadata = await requestJson<MinecraftVersionMetadata>(selectedVersion.url);
    let jvmArguments = metadata.arguments?.jvm ?? [];
    const gameDirectory = getProfileDirectory(profile, settings);
    if (!settings.minecraftDirectory.trim()) throw new Error('Set a Minecraft shared storage directory in Settings before launching.');
    if (!settings.launcherDirectory.trim()) throw new Error('Set a launcher data directory in Settings before launching.');
    const root = expandPath(settings.minecraftDirectory);
    if (!path.isAbsolute(gameDirectory)) throw new Error('The profile game directory must resolve to an absolute path.');
    if (containsPath(gameDirectory, root)) {
      throw new Error('The profile game directory cannot be the shared Minecraft directory or a parent of it. Choose a separate directory for this profile.');
    }
    const sameDirectory = (left: string, right: string) => process.platform === 'win32'
      ? left.toLowerCase() === right.toLowerCase()
      : left === right;
    const collision = profiles.find((other) => other.id !== profile.id && sameDirectory(getProfileDirectory(other, settings), gameDirectory));
    if (collision) throw new Error(`This game directory is also used by profile “${collision.name ?? collision.id}”. Choose a unique directory so profile files stay separate.`);
    await fs.mkdir(gameDirectory, { recursive: true });
    if (!(await fs.stat(gameDirectory)).isDirectory()) throw new Error(`The profile game directory is not a directory: ${gameDirectory}`);

    if (!Number.isFinite(profile.allocatedRam) || profile.allocatedRam < 2 || profile.allocatedRam > 64) {
      throw new Error('Set profile memory to a value between 2 and 64 GB.');
    }
    const memoryLimit = Math.max(2, Math.floor((os.totalmem() / (1024 ** 3)) * 0.8));
    if (profile.allocatedRam > memoryLimit) {
      throw new Error(`This device has ${Math.floor(os.totalmem() / (1024 ** 3))} GB of RAM. Reduce the profile allocation to ${memoryLimit} GB or less.`);
    }
    const requiredJava = metadata.javaVersion?.majorVersion
      ?? (profile.minecraftVersion === '1.20.5' || Number(profile.minecraftVersion.split('.')[1]) >= 21
        ? 21
        : Number(profile.minecraftVersion.split('.')[1]) >= 18
          ? 17
          : Number(profile.minecraftVersion.split('.')[1]) === 17
            ? 16
            : 8);
    const requestedJava = profile.javaPath.trim() || settings.javaPath.trim();
    const javaPath = requestedJava ? expandPath(requestedJava) : (await detectJava())[0]?.path ?? 'java';
    const java = await inspectJava(javaPath);
    if (!java) throw new Error(`Java was not found or could not be run at “${javaPath}”. Install Java ${requiredJava} or select a Java executable in profile settings.`);
    if (java.version < requiredJava) {
      throw new Error(`Minecraft ${profile.minecraftVersion} requires Java ${requiredJava} or newer, but ${javaPath} is Java ${java.version}. Select a compatible Java executable.`);
    }
    report({ phase: 'preparing', message: `Validated Java ${java.version} at ${javaPath}.` });
    if (profile.selectedModpack) throw new Error('Modpack installation is not implemented yet. Clear the selected modpack or launch a plain profile.');
    if (profile.loader !== 'Vanilla' && profile.loader !== 'Fabric') {
      throw new Error(`${profile.loader} installation and launching are not implemented yet. Select Vanilla or Fabric for this profile.`);
    }
    if (profile.loader === 'Vanilla' && profile.mods.some((item) => item.enabled)) {
      throw new Error('This profile has enabled mods, but mod loading is only implemented for Fabric. Select Fabric or disable those mods.');
    }
    if (profile.shaderPacks.some((item) => item.enabled)) {
      throw new Error('Shader packs need a shader loader such as Iris, which is not installed by FlowClient yet.');
    }

    await prepareItems(profile.mods, gameDirectory, 'mods');
    await prepareItems(profile.resourcePacks, gameDirectory, 'resourcepacks');
    await fs.mkdir(path.join(gameDirectory, 'shaderpacks'), { recursive: true });

    await fs.mkdir(root, { recursive: true });
    let customVersion: string | undefined;
    if (profile.loader === 'Fabric') {
      report({ phase: 'preparing', message: `Preparing Fabric for Minecraft ${profile.minecraftVersion}…` });
      const loaderVersions = await requestJson<FabricLoaderVersion[]>(`${fabricMetaUrl}/${encodeURIComponent(profile.minecraftVersion)}`);
      const selectedLoader = loaderVersions.find((item) => item.loader.stable) ?? loaderVersions[0];
      if (!selectedLoader?.loader.version) throw new Error(`Fabric has no compatible loader release for Minecraft ${profile.minecraftVersion}.`);
      const fabric = await requestJson<FabricProfile>(`${fabricMetaUrl}/${encodeURIComponent(profile.minecraftVersion)}/${encodeURIComponent(selectedLoader.loader.version)}/profile/json`);
      if (!fabric.id || fabric.inheritsFrom !== profile.minecraftVersion) {
        throw new Error('Fabric returned an invalid installation profile for the selected Minecraft version.');
      }
      const fabricJvmArguments = (fabric as FabricProfile & { arguments?: { jvm?: JvmArgumentEntry[] } }).arguments?.jvm;
      if (fabricJvmArguments) jvmArguments = fabricJvmArguments;
      customVersion = fabric.id.replace(/[^A-Za-z0-9._-]/g, '-');
      const versionDirectory = path.join(root, 'versions', customVersion);
      await fs.mkdir(versionDirectory, { recursive: true });
      await fs.writeFile(path.join(versionDirectory, `${customVersion}.json`), JSON.stringify({ ...fabric, id: customVersion }, null, 2), 'utf8');
    }

    const args = splitArguments(profile.jvmArguments);
    const unsupportedArguments = args.filter((argument) => /^-X(?:mx|ms)/i.test(argument) || /^-(?:cp|classpath|jar)$/i.test(argument));
    if (unsupportedArguments.length) {
      throw new Error(`Remove ${unsupportedArguments.join(', ')} from custom JVM arguments; FlowClient sets memory and class paths.`);
    }
    const loggingPath = await prepareLoggingConfig(metadata, root, report);
    const loggingArgument = loggingPath && metadata.logging?.client
      ? metadata.logging.client.argument.replace('${path}', loggingPath)
      : null;

    const client = new (getLauncherClientConstructor())();
    const lastDownloadStatus = new Map<string, number>();
    client.on('debug', (...values) => {
      const message = redact(values.map(String).join(' '), secrets);
      if (message.includes('Launching with arguments')) return;
      const error = /failed|couldn't start|unable to/i.test(message);
      if (/Attempting to download|Downloading|Downloaded|Cached/i.test(message)) {
        report({ phase: error ? 'error' : 'downloading', message, error });
      } else {
        report({ phase: error ? 'error' : 'preparing', message, error });
      }
    });
    client.on('download-status', (...values) => {
      const info = values[0] as { name?: string; current?: number; total?: number } | undefined;
      if (!info?.name) return;
      const percent = info.total ? Math.floor((info.current ?? 0) / info.total * 100) : null;
      const bucket = percent === null ? 0 : Math.floor(percent / 10);
      if (lastDownloadStatus.get(info.name) === bucket) return;
      lastDownloadStatus.set(info.name, bucket);
      report({ phase: 'downloading', message: `Downloading ${info.name}${percent === null ? '' : ` (${percent}%)`}` });
    });
    client.on('progress', (...values) => {
      const info = values[0] as { type?: string; task?: number; total?: number } | undefined;
      if (info?.type) report({ phase: 'downloading', message: `Preparing ${info.type}: ${info.task ?? 0}/${info.total ?? 0}` });
    });
    client.on('data', (...values) => {
      const message = redact(values.map(String).join(' '), secrets).trim();
      if (message) report({ phase: 'running', message });
    });
    let jvmArgumentError: Error | null = null;
    client.on('arguments', (...values) => {
      try {
        const launchArguments = values[0];
        if (!Array.isArray(launchArguments) || !launchArguments.every((argument) => typeof argument === 'string')) {
          throw new Error('The Minecraft launcher produced an invalid argument list.');
        }
        prepareJvmArguments(jvmArguments, launchArguments, root, profile.minecraftVersion);
      } catch (error) {
        jvmArgumentError = error instanceof Error ? error : new Error(String(error));
        throw jvmArgumentError;
      }
    });

    report({ phase: 'downloading', message: `Checking Minecraft ${profile.minecraftVersion} files…` });
    const accountStore = await readTokenStore();
    if (!accountStore[selectedAccountId]) throw new Error('The selected Microsoft account is not securely stored. Connect it again.');
    let processFailed = false;
    const launchPromise = client.launch({
      authorization: {
        access_token: token.accessToken,
        client_token: selectedAccountId,
        uuid: selectedAccountId.replace(/-/g, ''),
        name: (await requestJson<MinecraftProfileResponse>('https://api.minecraftservices.com/minecraft/profile', { headers: { Authorization: `Bearer ${token.accessToken}` } })).name,
        user_properties: '{}',
        meta: { type: 'msa', xuid: token.xuid, clientId: microsoftClientId },
      },
      root,
      version: { number: profile.minecraftVersion, type: 'release', ...(customVersion ? { custom: customVersion } : {}) },
      memory: { min: '2G', max: `${profile.allocatedRam}G` },
      javaPath,
      customArgs: loggingArgument ? [...args, loggingArgument] : args,
      overrides: { gameDirectory, cwd: root, detached: false },
    });
    report({ phase: 'launching', message: 'Downloading libraries and assets, then starting Minecraft…' });
    const child = await launchPromise;
    if (!child) throw jvmArgumentError ?? new Error('Minecraft could not be started. Review the launcher log for download or Java errors.');
    activeProcess = child;
    report({ phase: 'launching', message: `Minecraft process created${child.pid ? ` (PID ${child.pid})` : ''}.`, processId: child.pid ?? null });
    child.on('spawn', () => report({ phase: 'running', message: 'Minecraft Running', processId: child.pid ?? null }));
    child.on('error', (error) => {
      processFailed = true;
      report({ phase: 'error', message: `Minecraft process error: ${error.message}`, error: true, processId: child.pid ?? null });
      activeProcess = null;
    });
    child.on('close', (code, signal) => {
      activeProcess = null;
      const message = code === 0
        ? 'Minecraft closed normally.'
        : `Minecraft closed with ${signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`}.`;
      report({ phase: processFailed ? 'error' : 'ready', message, error: processFailed || code !== 0, processId: null });
    });
    if (child.exitCode !== null) {
      activeProcess = null;
      report({ phase: 'ready', message: 'Minecraft exited before startup completed.', processId: null });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report({ phase: 'error', message: redact(message, secrets), error: true, processId: null });
    throw new Error(redact(message, secrets));
  } finally {
    launchInProgress = false;
  }
}

export function stopMinecraft(): void {
  if (activeProcess && !activeProcess.killed) activeProcess.kill();
  activeProcess = null;
}
