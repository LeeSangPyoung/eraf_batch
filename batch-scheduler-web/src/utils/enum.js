export const failStates = [
  'FAILED',
  'BROKEN',
  'BLOCKED',
  'FAILURE',
  'failure',
  'cancelled',
  'false',
  'failed',
  'STOPPED',
  'stopped',
  'TIMEOUT',
  'timeout',
];
export const successStates = [
  'success',
  'SUCCESS',
  'true',
  'SUCCEED',
  'succeed',
];

export const runningStates = [
  'RUNNING',
  'running',
  'READY TO RUN',
  'ready to run',
  'ASSIGNED',
  'assigned',
];

export const standbyStates = ['STANDBY', 'standby', 'PENDING', 'pending', 'WAITING', 'waiting', 'DISABLED', 'disabled'];

export const completedStates = [
  'COMPLETED',
  'completed',
];

export const scheduledStates = [
  'SCHEDULED',
  'scheduled',
  'RETRY SCHEDULED',
  'retry SCHEDULED',
  'CREATED',
  'created',
];

export const enableOptions = ['true', 'false'];
export const currentStateOptions = [
  'SCHEDULED',
  'RUNNING',
  'WAITING',
  'COMPLETED',
  'BROKEN',
  'DISABLED',
  'STOPPED',
  'DELETED',
];

export const workflowStatusOptions = [
  'PENDING',
  'RUNNING',
  'SUCCESS',
  'FAILED',
];

export const workflowRunStatusOptions = ['RUNNING', 'SUCCESS', 'FAILED'];

export const lastResultOptions = ['SUCCESS', 'FAILURE', 'TIMEOUT', 'REVOKED', 'RETRY'];

export const operationOptions = [
  'RUN',
  'RETRY',
  'COMPLETED',
  'BROKEN',
  'REVOKED',
  'SKIPPED',
];

export const httpRequestPattern =
  /^(GET|POST|PUT|DELETE|PATCH|OPTIONS) [^\s]+ HTTP\/1\.1\r?\nHost: (https?:\/\/[^\s]+)\r?\n/;

export const UserType = [
  { value: 0, label: 'Administrator' },
  { value: 1, label: 'General User' },
];
