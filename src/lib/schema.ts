import { z } from "zod";

export const AgentId = z.enum(["claude", "codex", "gemini", "aider", "custom"]);
export type AgentId = z.infer<typeof AgentId>;

export const ScheduleType = z.enum(["cron", "interval", "manual"]);
export type ScheduleType = z.infer<typeof ScheduleType>;

export const TaskSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  agent: AgentId,
  command: z.string().min(1),
  workingDir: z.string().min(1),
  scheduleType: ScheduleType,
  scheduleCron: z.string().optional(),
  scheduleIntervalSeconds: z.number().positive().optional(),
  model: z.string().optional(),
  enabled: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskInput = z.object({
  name: z.string().min(1),
  agent: AgentId,
  command: z.string().min(1),
  workingDir: z.string().min(1),
  scheduleType: ScheduleType,
  scheduleCron: z.string().optional(),
  scheduleIntervalSeconds: z.number().positive().optional(),
  model: z.string().optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInput>;

export const ExecutionStatus = z.enum(["running", "success", "failed", "timeout"]);
export type ExecutionStatus = z.infer<typeof ExecutionStatus>;

export const ExecutionSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  exitCode: z.number().optional(),
  stdoutPath: z.string().optional(),
  stderrPath: z.string().optional(),
  stdoutTail: z.string().optional(),
  status: ExecutionStatus,
});
export type Execution = z.infer<typeof ExecutionSchema>;
