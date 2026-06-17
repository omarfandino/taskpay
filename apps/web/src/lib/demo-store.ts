import { MIN_REWARD_COPM, Task, TaskStatus, parseCopm } from "./constants";
import { zeroAddress } from "viem";

const STORAGE_KEY = "taskpay-demo-data-v2";
export const DEMO_POSTER =
  "0x0000000000000000000000000000000000000001" as const;
const INITIAL_BALANCE = parseCopm("5000");
const MIN_REWARD = parseCopm(String(MIN_REWARD_COPM));

type SerializedTask = {
  id: string;
  poster: `0x${string}`;
  taker: `0x${string}`;
  description: string;
  location: string;
  reward: string;
  deadline: string;
  status: TaskStatus;
  evidenceUrl: string;
  evidenceUrls?: string[];
};

type DemoData = {
  tasks: SerializedTask[];
  nextId: number;
  balances: Record<string, string>;
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeDemoStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((l) => l());
}

function serializeTask(task: Task): SerializedTask {
  return {
    id: task.id.toString(),
    poster: task.poster,
    taker: task.taker,
    description: task.description,
    location: task.location,
    reward: task.reward.toString(),
    deadline: task.deadline.toString(),
    status: task.status,
    evidenceUrl: task.evidenceUrl,
  };
}

function deserializeTask(raw: SerializedTask): Task {
  return {
    id: BigInt(raw.id),
    poster: raw.poster,
    taker: raw.taker,
    description: raw.description,
    location: raw.location,
    reward: BigInt(raw.reward),
    deadline: BigInt(raw.deadline),
    status: raw.status,
    evidenceUrl: raw.evidenceUrl,
  };
}

function nowSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

function createSeedTasks(): SerializedTask[] {
  const now = Number(nowSeconds());
  const seeds = [
    {
      description:
        "Is there a sportswear store at Calle 62 #8-100, Bogota? Need a storefront photo.",
      location: "Calle 62 #8-100, Bogota",
      deadline: now + 24 * 3600,
    },
    {
      description:
        "Is parking available near Universidad Icesi right now? Photo of the price sign.",
      location: "Universidad Icesi, Cali",
      deadline: now + 3600,
    },
    {
      description:
        "Is El Trigal bakery open at Av. 6N #23-50, Cali? Photo showing hours.",
      location: "Av. 6N #23-50, Cali",
      deadline: now + 2 * 3600,
    },
  ];

  return seeds.map((seed, i) =>
    serializeTask({
      id: BigInt(i + 1),
      poster: DEMO_POSTER,
      taker: zeroAddress,
      description: seed.description,
      location: seed.location,
      reward: MIN_REWARD,
      deadline: BigInt(seed.deadline),
      status: TaskStatus.Open,
      evidenceUrl: "",
    })
  );
}

function defaultData(): DemoData {
  return {
    tasks: createSeedTasks(),
    nextId: 3,
    balances: {},
  };
}

export function loadDemoData(): DemoData {
  if (typeof window === "undefined") return defaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw) as DemoData;
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) return defaultData();
    return {
      tasks: parsed.tasks,
      nextId: parsed.nextId ?? parsed.tasks.length,
      balances: parsed.balances ?? {},
    };
  } catch {
    return defaultData();
  }
}

function saveDemoData(data: DemoData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  notify();
}

export function resetDemoData(): void {
  saveDemoData(defaultData());
}

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function getBalance(data: DemoData, address: string): bigint {
  const key = normalizeAddress(address);
  const stored = data.balances[key];
  if (stored !== undefined) return BigInt(stored);
  return INITIAL_BALANCE;
}

function setBalance(data: DemoData, address: string, amount: bigint): void {
  data.balances[normalizeAddress(address)] = amount.toString();
}

export function ensureDemoBalance(address: string): bigint {
  const data = loadDemoData();
  const bal = getBalance(data, address);
  if (data.balances[normalizeAddress(address)] === undefined) {
    setBalance(data, address, INITIAL_BALANCE);
    saveDemoData(data);
  }
  return bal;
}

export function getDemoBalance(address: string): bigint {
  return getBalance(loadDemoData(), address);
}

function getEvidenceUrls(raw: SerializedTask): string[] {
  if (raw.evidenceUrls?.length) return raw.evidenceUrls;
  if (raw.evidenceUrl) return [raw.evidenceUrl];
  return [];
}

export function getDemoEvidenceUrls(taskId: bigint): string[] {
  const data = loadDemoData();
  const raw = data.tasks.find((t) => t.id === taskId.toString());
  return raw ? getEvidenceUrls(raw) : [];
}

function appendEvidence(raw: SerializedTask, url: string): void {
  const urls = getEvidenceUrls(raw);
  urls.push(url);
  raw.evidenceUrls = urls;
  raw.evidenceUrl = url;
}

function findTask(data: DemoData, taskId: bigint): SerializedTask {
  const id = taskId.toString();
  const task = data.tasks.find((t) => t.id === id);
  if (!task) throw new Error("TaskNotFound");
  return task;
}

function isOpen(task: SerializedTask): boolean {
  const t = deserializeTask(task);
  return (
    t.status === TaskStatus.Open && t.deadline > nowSeconds()
  );
}

export function getOpenTasks(): Task[] {
  return loadDemoData()
    .tasks.filter(isOpen)
    .map(deserializeTask);
}

export function getTask(taskId: bigint): Task | null {
  const data = loadDemoData();
  const task = data.tasks.find((t) => t.id === taskId.toString());
  return task ? deserializeTask(task) : null;
}

export function getTasksByPoster(poster: `0x${string}`): Task[] {
  const key = normalizeAddress(poster);
  return loadDemoData()
    .tasks.filter((t) => normalizeAddress(t.poster) === key)
    .map(deserializeTask);
}

export function getTasksByTaker(taker: `0x${string}`): Task[] {
  const key = normalizeAddress(taker);
  return loadDemoData()
    .tasks.filter(
      (t) => t.taker !== zeroAddress && normalizeAddress(t.taker) === key
    )
    .map(deserializeTask);
}

export function demoPostTask(
  poster: `0x${string}`,
  description: string,
  location: string,
  deadline: bigint,
  reward: bigint
): bigint {
  if (!description.trim()) throw new Error("EmptyDescription");
  if (!location.trim()) throw new Error("EmptyLocation");
  if (reward < MIN_REWARD) throw new Error("InvalidReward");
  if (deadline <= nowSeconds()) throw new Error("InvalidDeadline");

  const data = loadDemoData();
  const balance = getBalance(data, poster);
  if (balance < reward) throw new Error("InsufficientBalance");

  setBalance(data, poster, balance - reward);
  const taskId = BigInt(data.nextId + 1);
  data.nextId += 1;
  data.tasks.push(
    serializeTask({
      id: taskId,
      poster,
      taker: zeroAddress,
      description: description.trim(),
      location: location.trim(),
      reward,
      deadline,
      status: TaskStatus.Open,
      evidenceUrl: "",
    })
  );
  saveDemoData(data);
  return taskId;
}

export function demoTakeTask(
  taskId: bigint,
  taker: `0x${string}`
): void {
  const data = loadDemoData();
  const raw = findTask(data, taskId);
  const task = deserializeTask(raw);

  if (task.status !== TaskStatus.Open) throw new Error("TaskNotOpen");
  if (task.deadline <= nowSeconds()) throw new Error("DeadlinePassed");
  if (normalizeAddress(task.poster) === normalizeAddress(taker)) {
    throw new Error("CannotTakeOwnTask");
  }

  raw.status = TaskStatus.Taken;
  raw.taker = taker;
  saveDemoData(data);
}

export function demoSubmitEvidence(
  taskId: bigint,
  taker: `0x${string}`,
  evidenceUrl: string
): void {
  if (!evidenceUrl.trim()) throw new Error("EvidenceRequired");

  const data = loadDemoData();
  const raw = findTask(data, taskId);
  const task = deserializeTask(raw);

  if (task.status !== TaskStatus.Taken) throw new Error("TaskNotTaken");
  if (normalizeAddress(task.taker) !== normalizeAddress(taker)) {
    throw new Error("NotTaker");
  }

  appendEvidence(raw, evidenceUrl);
  saveDemoData(data);
}

export function demoMarkTaskComplete(
  taskId: bigint,
  taker: `0x${string}`
): void {
  const data = loadDemoData();
  const raw = findTask(data, taskId);
  const task = deserializeTask(raw);

  if (task.status !== TaskStatus.Taken) throw new Error("TaskNotTaken");
  if (normalizeAddress(task.taker) !== normalizeAddress(taker)) {
    throw new Error("NotTaker");
  }
  if (getEvidenceUrls(raw).length === 0) throw new Error("EvidenceRequired");

  raw.status = TaskStatus.PendingReview;
  saveDemoData(data);
}

export function isDemoSeedTask(poster: string): boolean {
  return normalizeAddress(poster) === normalizeAddress(DEMO_POSTER);
}

export function demoApproveSeedTask(taskId: bigint): void {
  demoApproveTask(taskId, DEMO_POSTER);
}

export function demoRejectSeedTask(taskId: bigint): void {
  demoRejectTask(taskId, DEMO_POSTER);
}

export function demoApproveTask(
  taskId: bigint,
  poster: `0x${string}`
): void {
  const data = loadDemoData();
  const raw = findTask(data, taskId);
  const task = deserializeTask(raw);

  if (task.status !== TaskStatus.PendingReview) {
    throw new Error("TaskNotPendingReview");
  }
  if (normalizeAddress(task.poster) !== normalizeAddress(poster)) {
    throw new Error("NotPoster");
  }
  if (getEvidenceUrls(raw).length === 0) throw new Error("EvidenceRequired");

  raw.status = TaskStatus.Completed;
  const takerBal = getBalance(data, task.taker);
  setBalance(data, task.taker, takerBal + task.reward);
  saveDemoData(data);
}

export function demoRejectTask(
  taskId: bigint,
  poster: `0x${string}`
): void {
  const data = loadDemoData();
  const raw = findTask(data, taskId);
  const task = deserializeTask(raw);

  if (task.status !== TaskStatus.PendingReview) {
    throw new Error("TaskNotPendingReview");
  }
  if (normalizeAddress(task.poster) !== normalizeAddress(poster)) {
    throw new Error("NotPoster");
  }

  raw.status = TaskStatus.Cancelled;
  const posterBal = getBalance(data, poster);
  setBalance(data, poster, posterBal + task.reward);
  saveDemoData(data);
}

export function demoCancelTask(
  taskId: bigint,
  poster: `0x${string}`
): void {
  const data = loadDemoData();
  const raw = findTask(data, taskId);
  const task = deserializeTask(raw);

  if (task.status !== TaskStatus.Open) throw new Error("TaskNotOpen");
  if (normalizeAddress(task.poster) !== normalizeAddress(poster)) {
    throw new Error("NotPoster");
  }

  raw.status = TaskStatus.Cancelled;
  const posterBal = getBalance(data, poster);
  setBalance(data, poster, posterBal + task.reward);
  saveDemoData(data);
}

export function simulateTxDelay(): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, 400 + Math.random() * 200)
  );
}
